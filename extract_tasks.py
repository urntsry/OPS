import re

# 讀取 init_schema_and_seeds.sql
with open('docs/init_schema_and_seeds.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取所有任務的標題、頻率、積分、地點、來源
pattern = r"INSERT INTO public\.task_definitions.*?VALUES \('([^']+)', '([^']+)', (\d+), '([^']+)', .*?'([^']+)'\);"
matches = re.findall(pattern, content, re.DOTALL)

print(f'找到 {len(matches)} 個任務')

# 生成新的 SQL
sql_lines = []
sql_lines.append('-- =====================================================')
sql_lines.append('-- 匯入 98 個任務（不綁定負責人）')
sql_lines.append('-- 執行前請確保：')
sql_lines.append('-- 1. 已執行 update_all_employees.sql (79 位員工)')
sql_lines.append('-- 2. 已加入 password 欄位')
sql_lines.append('-- =====================================================')
sql_lines.append('')
sql_lines.append('-- 清空任務（保留員工）')
sql_lines.append('DELETE FROM public.daily_assignments;')
sql_lines.append('DELETE FROM public.task_definitions;')
sql_lines.append('')
sql_lines.append('-- 插入 98 個任務（不綁定負責人）')

for i, (title, freq, points, location, source) in enumerate(matches, 1):
    sql = f"INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('{title}', '{freq}', {points}, '{location}', '{source}');"
    sql_lines.append(sql)

sql_lines.append('')
sql_lines.append('-- 驗證')
sql_lines.append('SELECT COUNT(*) as total_tasks FROM public.task_definitions;')
sql_lines.append("SELECT frequency, COUNT(*) as count FROM public.task_definitions GROUP BY frequency ORDER BY frequency;")

# 寫入新文件
output = '\n'.join(sql_lines)
with open('docs/import_98_tasks.sql', 'w', encoding='utf-8') as f:
    f.write(output)

print('✅ 已生成: docs/import_98_tasks.sql')
print(f'✅ 共 {len(matches)} 個任務')

