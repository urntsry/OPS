#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
THERMOTECH-OPS - 智能 Excel 解析器
專門解析工作盤點表格，提取員工和任務資料
"""

import pandas as pd
from pathlib import Path
import json

def parse_task_excel(file_path):
    """解析單個任務盤點表"""
    df = pd.read_excel(file_path)
    
    # 第 2 行（索引 1）包含員工資訊
    header_row = df.iloc[1]
    
    # 提取員工資訊
    employee_info = {}
    for idx, value in enumerate(header_row):
        if pd.isna(value):
            continue
        if str(value) == '姓名' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                employee_info['name'] = str(next_val)
        elif str(value) == '員工編號' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                employee_info['employee_id'] = str(int(next_val))
        elif str(value) == '主管' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                employee_info['supervisor'] = str(next_val)
        elif str(value) == '職稱' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                employee_info['job_title'] = str(next_val)
        elif str(value) == '部門' and idx + 1 < len(header_row):
            next_val = header_row.iloc[idx + 1]
            if not pd.isna(next_val):
                employee_info['department'] = str(next_val)
    
    # 第 3 行（索引 2）包含部門資訊
    dept_row = df.iloc[2]
    for idx, value in enumerate(dept_row):
        if pd.isna(value):
            continue
        if str(value) == '部門' and idx + 1 < len(dept_row):
            if 'department' not in employee_info:
                next_val = dept_row.iloc[idx + 1]
                if not pd.isna(next_val):
                    employee_info['department'] = str(next_val)
        elif str(value) == '職稱' and idx + 1 < len(dept_row):
            if 'job_title' not in employee_info:
                next_val = dept_row.iloc[idx + 1]
                if not pd.isna(next_val):
                    employee_info['job_title'] = str(next_val)
    
    # 第 4 行（索引 3）是欄位標題
    # 第 5 行（索引 4）是 "地點 #316 #310"
    
    # 從第 6 行開始是實際任務資料
    task_data_start = 5
    tasks = []
    
    for row_idx in range(task_data_start, len(df)):
        row = df.iloc[row_idx]
        # 跳過空行
        if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
            continue
        
        task = {
            'task_name': str(row.iloc[0]) if not pd.isna(row.iloc[0]) else None,
            'location_316': str(row.iloc[1]) if not pd.isna(row.iloc[1]) else None,
            'location_310': str(row.iloc[2]) if not pd.isna(row.iloc[2]) else None,
        }
        
        # 嘗試識別頻率欄位
        for col_idx in range(8, min(15, len(row))):
            val = row.iloc[col_idx]
            if not pd.isna(val):
                col_name = f'frequency_{col_idx}'
                task[col_name] = str(val)
        
        tasks.append(task)
    
    return {
        'file_name': file_path.name,
        'employee': employee_info,
        'total_tasks': len(tasks),
        'tasks': tasks
    }

def main():
    print("="*80)
    print(" THERMOTECH-OPS - 智能解析器 ")
    print("="*80)
    
    ref_folder = Path(__file__).parent / 'ref'
    excel_files = sorted(ref_folder.glob('*.xlsx'))
    
    all_results = []
    all_employees = []
    
    for excel_file in excel_files:
        print(f"\n[處理] {excel_file.name}")
        try:
            result = parse_task_excel(excel_file)
            all_results.append(result)
            
            emp = result['employee']
            if 'name' in emp and 'employee_id' in emp:
                all_employees.append(emp)
                print(f"  [員工] {emp.get('name')} ({emp.get('employee_id')})")
                print(f"  [部門] {emp.get('department', 'N/A')}")
                print(f"  [職稱] {emp.get('job_title', 'N/A')}")
                print(f"  [任務數] {result['total_tasks']}")
        except Exception as e:
            print(f"  [錯誤] {str(e)}")
    
    # 儲存結果
    output_file = Path(__file__).parent / 'parsed_data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(all_results),
                'total_employees': len(all_employees),
                'total_tasks': sum(r['total_tasks'] for r in all_results)
            },
            'employees': all_employees,
            'files': all_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*80}")
    print(f"[完成] 成功解析 {len(all_results)} 個檔案")
    print(f"[完成] 找到 {len(all_employees)} 位員工")
    print(f"[完成] 總任務數: {sum(r['total_tasks'] for r in all_results)}")
    print(f"[儲存] {output_file}")
    print(f"{'='*80}\n")
    
    # 顯示所有員工
    print("\n[員工清單]")
    for emp in all_employees:
        print(f"  {emp.get('employee_id'):6s} | {emp.get('name'):10s} | {emp.get('department', 'N/A'):12s} | {emp.get('job_title', 'N/A')}")

if __name__ == '__main__':
    main()

