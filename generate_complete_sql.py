import json
import uuid

# 讀取資料
with open('final_data_package.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 讀取 79 人完整名單
with open('docs/update_all_employees.sql', 'r', encoding='utf-8') as f:
    employees_sql = f.read()

# 提取員工資料（員工編號 → UUID 的映射）
import re
employee_pattern = r"VALUES \('([^']+)', '([^']+)', '([^']+)',"
employee_matches = re.findall(employee_pattern, employees_sql)

# 建立員工編號 → UUID 的字典
employee_id_to_uuid = {}
employee_name_to_id = {}

for uuid_str, emp_id, full_name in employee_matches:
    employee_id_to_uuid[emp_id] = uuid_str
    employee_name_to_id[full_name] = emp_id

print(f"找到 {len(employee_id_to_uuid)} 位員工")

# 建立員工姓名 → UUID 的映射（根據 final_data_package.json）
name_to_uuid = {}
for name, info in data['employees'].items():
    emp_id = info.get('id')
    if emp_id and emp_id != 'TBD' and emp_id in employee_id_to_uuid:
        name_to_uuid[name] = employee_id_to_uuid[emp_id]
        # print(f"OK {name} ({emp_id}) -> {employee_id_to_uuid[emp_id][:8]}...")

print(f"\n成功映射 {len(name_to_uuid)} 位員工的 UUID")

# 收集所有任務
all_tasks = []
task_id = 1

for person_data in data['task_matrix']:
    meta = person_data['meta']
    source_file = meta['file']
    
    for task in person_data['tasks']:
        title = task['title']
        site = task['site']
        frequency = task['frequency']
        default_assignee_name = task.get('default_assignee', '')
        backup_assignees = task.get('backup_assignees', [])
        
        # 查找 UUID
        default_uuid = name_to_uuid.get(default_assignee_name)
        backup_uuid = None
        if backup_assignees and len(backup_assignees) > 0:
            backup_uuid = name_to_uuid.get(backup_assignees[0])
        
        # 計算積分
        points_map = {
            'daily': 10,
            'weekly': 50,
            'monthly': 100,
            'event_triggered': 20
        }
        points = points_map.get(frequency, 10)
        
        all_tasks.append({
            'id': task_id,
            'title': title,
            'frequency': frequency,
            'points': points,
            'site': site,
            'default_uuid': default_uuid,
            'backup_uuid': backup_uuid,
            'source_file': source_file
        })
        task_id += 1

print(f"\n收集到 {len(all_tasks)} 個任務")

# 統計有多少任務有預設負責人
tasks_with_assignee = sum(1 for t in all_tasks if t['default_uuid'])
print(f"其中 {tasks_with_assignee} 個任務有預設負責人")

# 生成 SQL
sql_lines = []
sql_lines.append('-- =====================================================')
sql_lines.append('-- THERMOTECH-OPS 完整初始化腳本（含任務綁定）')
sql_lines.append('-- 79 位員工 + 98 個任務（根據 Excel 預設綁定）')
sql_lines.append('-- =====================================================')
sql_lines.append('')

# 第 1 部分：清空並匯入員工
sql_lines.append('-- ============ 第 1 步：清空並匯入 79 位員工 ============')
sql_lines.append('DELETE FROM public.daily_assignments;')
sql_lines.append('DELETE FROM public.task_definitions;')
sql_lines.append('DELETE FROM public.profiles;')
sql_lines.append('')

# 從 update_all_employees.sql 複製員工資料（但修正 role）
for uuid_str, emp_id, full_name in employee_matches:
    # 判斷 role
    if emp_id in ['70231', '70250', 'A0001']:
        role = 'admin'
    else:
        role = 'user'
    
    # 從原始 SQL 找到完整的 INSERT 語句
    pattern = rf"VALUES \('{uuid_str}', '{emp_id}', '{full_name}', '([^']+)', '([^']*)', '([^']+)', '([^']+)'\)"
    match = re.search(pattern, employees_sql)
    if match:
        department, job_title, _, site_code = match.groups()
        sql = f"INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('{uuid_str}', '{emp_id}', '{full_name}', '{department}', '{job_title}', '{role}', '{site_code}');"
        sql_lines.append(sql)

# 第 2 部分：加入密碼
sql_lines.append('')
sql_lines.append('-- ============ 第 2 步：加入密碼欄位 ============')
sql_lines.append('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT \'Ops2025!\';')
sql_lines.append('UPDATE public.profiles SET password = \'Admin369888\' WHERE employee_id IN (\'70231\', \'70250\', \'A0001\');')
sql_lines.append('')

# 第 3 部分：匯入任務（帶 UUID 綁定）
sql_lines.append('-- ============ 第 3 步：匯入 98 個任務（根據 Excel 預設綁定）============')

for task in all_tasks:
    title = task['title'].replace("'", "''")  # 處理單引號
    freq = task['frequency']
    points = task['points']
    site = task['site']
    default_uuid = task['default_uuid'] if task['default_uuid'] else 'NULL'
    backup_uuid = task['backup_uuid'] if task['backup_uuid'] else 'NULL'
    source = task['source_file']
    
    if default_uuid != 'NULL':
        default_uuid = f"'{default_uuid}'"
    if backup_uuid != 'NULL':
        backup_uuid = f"'{backup_uuid}'"
    
    sql = f"INSERT INTO public.task_definitions (title, frequency, base_points, site_location, default_assignee_id, backup_assignee_id, source_file) VALUES ('{title}', '{freq}', {points}, '{site}', {default_uuid}, {backup_uuid}, '{source}');"
    sql_lines.append(sql)

# 第 4 部分：驗證
sql_lines.append('')
sql_lines.append('-- ============ 第 4 步：驗證 ============')
sql_lines.append('SELECT ')
sql_lines.append('  (SELECT COUNT(*) FROM public.profiles) as total_users,')
sql_lines.append('  (SELECT COUNT(*) FROM public.profiles WHERE role = \'admin\') as admin_users,')
sql_lines.append('  (SELECT COUNT(*) FROM public.task_definitions) as total_tasks,')
sql_lines.append('  (SELECT COUNT(*) FROM public.task_definitions WHERE default_assignee_id IS NOT NULL) as tasks_with_assignee;')
sql_lines.append('')
sql_lines.append('-- 檢查關鍵員工')
sql_lines.append('SELECT employee_id, full_name, role, password FROM public.profiles WHERE employee_id IN (\'70037\', \'70231\', \'70250\', \'A0001\') ORDER BY employee_id;')

# 寫入檔案
output = '\n'.join(sql_lines)
with open('docs/COMPLETE_INIT_WITH_UUID_BINDING.sql', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\n[OK] 已生成: docs/COMPLETE_INIT_WITH_UUID_BINDING.sql")
print(f"[OK] 包含 {len(employee_id_to_uuid)} 位員工")
print(f"[OK] 包含 {len(all_tasks)} 個任務")
print(f"[OK] 其中 {tasks_with_assignee} 個任務已預設綁定負責人")

