#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
THERMOTECH-OPS - 完整資料結構解析器
根據資料結構指南，正確解析表單的三個部分：
1. 表頭 (人員資訊)
2. 任務矩陣 (工作內容 + 廠別)
3. 權責矩陣 (頻率 + 主辦/協辦)
"""

import pandas as pd
from pathlib import Path
import json
from collections import defaultdict

def parse_complete_structure(file_path):
    """完整解析單個 Excel 檔案"""
    
    print(f"\n{'='*80}")
    print(f"[解析] {file_path.name}")
    print(f"{'='*80}")
    
    df = pd.read_excel(file_path)
    
    # ============================================
    # PART 1: 表頭資訊（第 2-3 行）
    # ============================================
    header_row = df.iloc[1]  # 第 2 行
    dept_row = df.iloc[2]     # 第 3 行
    
    # 提取主要負責人資訊
    primary_employee = {}
    for idx, value in enumerate(header_row):
        if pd.isna(value):
            continue
        if str(value) == '姓名' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                primary_employee['name'] = str(next_val)
        elif str(value) == '員工編號' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                primary_employee['employee_id'] = str(int(next_val))
        elif str(value) == '主管' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                primary_employee['supervisor'] = str(next_val)
        elif str(value) == '職稱' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                primary_employee['job_title'] = str(next_val)
    
    # 從第 3 行補充部門資訊
    for idx, value in enumerate(dept_row):
        if pd.isna(value):
            continue
        if str(value) == '部門' and idx + 1 < len(dept_row):
            next_val = dept_row.iloc[idx + 1]
            if not pd.isna(next_val):
                primary_employee['department'] = str(next_val)
        elif str(value) == '職稱' and idx + 1 < len(dept_row):
            if 'job_title' not in primary_employee:
                next_val = dept_row.iloc[idx + 1]
                if not pd.isna(next_val):
                    primary_employee['job_title'] = str(next_val)
    
    print(f"\n[主要負責人] {primary_employee.get('name', 'N/A')}")
    
    # ============================================
    # PART 2: 欄位標題分析（第 4-5 行）
    # ============================================
    field_header_row = df.iloc[3]  # 第 4 行：欄位標題
    location_row = df.iloc[4]      # 第 5 行：地點 (#316, #310)
    
    # 識別欄位結構
    columns_mapping = {}
    frequency_columns = []
    collaborator_columns = []
    
    for col_idx, (field_name, location) in enumerate(zip(field_header_row, location_row)):
        field_str = str(field_name).strip() if not pd.isna(field_name) else ''
        location_str = str(location).strip() if not pd.isna(location) else ''
        
        # 工作內容欄位
        if '工作內容' in field_str or col_idx == 0:
            columns_mapping['task_name'] = col_idx
        
        # 廠區欄位
        elif '#316' in location_str:
            columns_mapping['location_316'] = col_idx
        elif '#310' in location_str:
            columns_mapping['location_310'] = col_idx
        
        # 頻率欄位（每日、每週、每月等）
        elif any(freq in field_str for freq in ['每日', '每週', '每月', '每季', '每半年', '每年', '不固定']):
            frequency_columns.append({
                'index': col_idx,
                'name': field_str,
                'frequency_type': field_str
            })
        
        # 協辦人欄位（右側的人名）
        elif field_str and field_str not in ['nan', 'NaN', ''] and len(field_str) < 20:
            # 可能是人名或相關標題
            if not field_str.startswith('Unnamed'):
                # 排除說明性文字，保留可能的人名
                if '說明' not in field_str and '主辦' not in field_str and '協辦' not in field_str and '執行' not in field_str:
                    # 檢查是否為中文人名（通常 2-4 個字）
                    if 2 <= len(field_str) <= 6:
                        collaborator_columns.append({
                            'index': col_idx,
                            'name': field_str
                        })
    
    print(f"\n[欄位結構]")
    print(f"  - 頻率欄位: {len(frequency_columns)} 個")
    print(f"  - 協辦人欄位: {len(collaborator_columns)} 個")
    
    if collaborator_columns:
            print(f"\n[發現協辦人] {len(collaborator_columns)} 位:")
            for col in collaborator_columns[:10]:  # 只顯示前10個避免編碼錯誤
                try:
                    print(f"  - {col['name']}")
                except:
                    print(f"  - [編碼錯誤]")
            if len(collaborator_columns) > 10:
                print(f"  - ... 以及其他 {len(collaborator_columns) - 10} 位")
    
    # ============================================
    # PART 3: 任務資料解析（第 6 行開始）
    # ============================================
    tasks = []
    task_start_row = 5
    
    for row_idx in range(task_start_row, len(df)):
        row = df.iloc[row_idx]
        
        # 跳過空行或說明行
        first_cell = row.iloc[0]
        if pd.isna(first_cell):
            continue
        first_cell_str = str(first_cell).strip()
        if first_cell_str in ['', 'nan', 'NaN'] or '說明' in first_cell_str:
            continue
        
        task = {
            'task_name': first_cell_str,
            'location_316': None,
            'location_310': None,
            'frequencies': [],
            'main_assignee': None,
            'backup_assignees': []
        }
        
        # 提取廠區資訊
        if 'location_316' in columns_mapping:
            val = row.iloc[columns_mapping['location_316']]
            if not pd.isna(val) and str(val).strip() in ['●', '◎', 'O', 'o', 'V', 'v']:
                task['location_316'] = True
        
        if 'location_310' in columns_mapping:
            val = row.iloc[columns_mapping['location_310']]
            if not pd.isna(val) and str(val).strip() in ['●', '◎', 'O', 'o', 'V', 'v']:
                task['location_310'] = True
        
        # 提取頻率資訊
        for freq_col in frequency_columns:
            val = row.iloc[freq_col['index']]
            if not pd.isna(val) and str(val).strip() in ['●', '◎', 'O', 'o', 'V', 'v']:
                task['frequencies'].append(freq_col['frequency_type'])
        
        # 提取協辦人資訊（主辦 ● vs 協辦 ◎）
        for collab_col in collaborator_columns:
            val = row.iloc[collab_col['index']]
            if not pd.isna(val):
                marker = str(val).strip()
                if marker == '●':
                    task['main_assignee'] = collab_col['name']
                elif marker == '◎':
                    task['backup_assignees'].append(collab_col['name'])
        
        tasks.append(task)
    
    print(f"\n[解析結果] 找到 {len(tasks)} 個任務")
    
    return {
        'file_name': file_path.name,
        'primary_employee': primary_employee,
        'collaborators': [col['name'] for col in collaborator_columns],
        'frequency_types': [freq['frequency_type'] for freq in frequency_columns],
        'total_tasks': len(tasks),
        'tasks': tasks
    }

def main():
    """主程式"""
    print("=" * 100)
    print(" " * 30 + "THERMOTECH-OPS 完整資料結構解析")
    print("=" * 100)
    
    ref_folder = Path(__file__).parent / 'ref'
    excel_files = sorted(ref_folder.glob('*.xlsx'))
    
    all_results = []
    all_employees = set()
    all_frequency_types = set()
    employee_to_files = defaultdict(list)
    
    for excel_file in excel_files:
        try:
            result = parse_complete_structure(excel_file)
            all_results.append(result)
            
            # 收集主要負責人
            primary = result['primary_employee']
            if primary.get('name'):
                all_employees.add(primary['name'])
                employee_to_files[primary['name']].append({
                    'file': result['file_name'],
                    'role': '主要負責人',
                    'employee_id': primary.get('employee_id', '未找到')
                })
            
            # 收集協辦人
            for collab_name in result['collaborators']:
                all_employees.add(collab_name)
                employee_to_files[collab_name].append({
                    'file': result['file_name'],
                    'role': '協辦人'
                })
            
            # 收集頻率類型
            all_frequency_types.update(result['frequency_types'])
            
        except Exception as e:
            print(f"\n[錯誤] {excel_file.name}: {str(e)}")
    
    # 產生完整報告
    print(f"\n{'='*100}")
    print("[總結報告]")
    print(f"{'='*100}")
    print(f"\n[OK] 成功解析 {len(all_results)} 個檔案")
    print(f"[OK] 找到 {len(all_employees)} 位員工（包含主要負責人 + 協辦人）")
    print(f"[OK] 發現 {len(all_frequency_types)} 種頻率類型")
    print(f"[OK] 總任務數: {sum(r['total_tasks'] for r in all_results)}")
    
    print(f"\n[所有員工清單] ({len(all_employees)} 位)")
    print("-" * 80)
    for idx, emp_name in enumerate(sorted(all_employees), 1):
        files_info = employee_to_files[emp_name]
        roles = set(f['role'] for f in files_info)
        role_str = ', '.join(roles)
        print(f"  {idx:2d}. {emp_name:<12} - {role_str:<15} (出現於 {len(files_info)} 個檔案)")
    
    print(f"\n[頻率類型]")
    for freq in sorted(all_frequency_types):
        print(f"  - {freq}")
    
    # 儲存完整資料
    output_file = Path(__file__).parent / 'complete_structure.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(all_results),
                'total_employees': len(all_employees),
                'total_tasks': sum(r['total_tasks'] for r in all_results),
                'frequency_types': sorted(list(all_frequency_types))
            },
            'employees': {
                name: employee_to_files[name]
                for name in sorted(all_employees)
            },
            'files': all_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n[儲存] 完整資料已儲存至: {output_file}")
    print("=" * 100 + "\n")

if __name__ == '__main__':
    main()

