#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
THERMOTECH-OPS - 最終資料匯總（輸出到檔案）
解決終端機編碼問題
"""

import json
from pathlib import Path

def generate_report():
    """產生完整的資料報告"""
    
    # 讀取解析結果
    data_file = Path(__file__).parent / 'parsed_data.json'
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 建立輸出檔案
    report_file = Path(__file__).parent / 'EMPLOYEE_REPORT.txt'
    
    with open(report_file, 'w', encoding='utf-8') as report:
        report.write("=" * 100 + "\n")
        report.write(" " * 35 + "THERMOTECH-OPS 資料匯總報告\n")
        report.write("=" * 100 + "\n\n")
        
        report.write(f"[總覽]\n")
        report.write(f"  - 檔案總數: {data['summary']['total_files']}\n")
        report.write(f"  - 任務總數: {data['summary']['total_tasks']}\n\n")
        
        report.write(f"[員工清單]\n")
        report.write(f"{'編號':<10} | {'姓名':<12} | {'職稱':<15} | {'部門':<15} | {'主管':<12} | {'任務數':<8} | {'檔案名稱'}\n")
        report.write("-" * 120 + "\n")
        
        employees_found = []
        
        for file_data in data['files']:
            emp = file_data['employee']
            emp_name = emp.get('name', 'N/A')
            emp_job = emp.get('job_title', 'N/A')
            emp_dept = emp.get('department', 'N/A')
            emp_supervisor = emp.get('supervisor', 'N/A')
            emp_id = emp.get('employee_id', '未找到')
            file_name = file_data['file_name']
            task_count = file_data['total_tasks']
            
            employees_found.append({
                'id': emp_id,
                'name': emp_name,
                'job_title': emp_job,
                'department': emp_dept,
                'supervisor': emp_supervisor,
                'file': file_name,
                'task_count': task_count
            })
            
            report.write(f"{emp_id:<10} | {emp_name:<12} | {emp_job:<15} | {emp_dept:<15} | {emp_supervisor:<12} | {task_count:<8} | {file_name}\n")
        
        # 根據檔案名稱推測部門和廠區
        report.write("\n" + "=" * 100 + "\n")
        report.write("[部門/廠區推測分析]\n")
        report.write("-" * 100 + "\n\n")
        
        dept_mapping = {
            '310電熱布包組': {'dept': '廠務部', 'site': '310', 'group': '電熱布包組'},
            '業務部': {'dept': '業務部', 'site': 'ALL', 'group': '業務'},
            '管理部': {'dept': '管理部', 'site': 'ALL', 'group': '管理'},
            '高上316接頭組': {'dept': '廠務部', 'site': '316', 'group': '接頭組'},
            '高上316車縫布包組': {'dept': '廠務部', 'site': '316', 'group': '車縫布包組'},
            '高獅車縫布包組': {'dept': '廠務部', 'site': 'KS', 'group': '車縫布包組'},
            '高獅電熱布包組': {'dept': '廠務部', 'site': 'KS', 'group': '電熱布包組'},
        }
        
        enriched_employees = []
        for emp in employees_found:
            for keyword, mapping in dept_mapping.items():
                if keyword in emp['file']:
                    emp['inferred_dept'] = mapping['dept']
                    emp['inferred_site'] = mapping['site']
                    emp['inferred_group'] = mapping['group']
                    break
            enriched_employees.append(emp)
        
        report.write(f"{'姓名':<12} | {'推測部門':<12} | {'廠區':<6} | {'組別':<15} | {'檔案來源'}\n")
        report.write("-" * 100 + "\n")
        for emp in enriched_employees:
            name = emp.get('name', 'N/A')
            dept = emp.get('inferred_dept', 'N/A')
            site = emp.get('inferred_site', 'N/A')
            group = emp.get('inferred_group', 'N/A')
            file = emp.get('file', 'N/A')
            report.write(f"{name:<12} | {dept:<12} | {site:<6} | {group:<15} | {file}\n")
        
        report.write("\n" + "=" * 100 + "\n")
        report.write(f"[完成] 找到 {len(enriched_employees)} 位員工\n")
        report.write("=" * 100 + "\n")
        
        # 需要注意的問題
        report.write("\n[⚠️  資料問題]\n")
        missing_ids = [emp for emp in enriched_employees if emp.get('id') == '未找到']
        if missing_ids:
            report.write(f"\n1. 缺少員工編號的人員（共 {len(missing_ids)} 位）:\n")
            for emp in missing_ids:
                report.write(f"   - {emp['name']} ({emp.get('inferred_group', 'N/A')})\n")
        
        report.write("\n2. 與原始規格比對:\n")
        report.write("   原始規格中提到 22 位員工，但 Excel 只找到 7 位\n")
        report.write("   可能原因:\n")
        report.write("   - 每個 Excel 檔案只包含該組別負責人的資訊\n")
        report.write("   - 其他員工資訊可能在檔案內容中（需要更深入解析）\n")
    
    # 儲存豐富化後的員工資料
    output_file = Path(__file__).parent / 'employees_enriched.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(enriched_employees, f, ensure_ascii=False, indent=2)
    
    print("[OK] 報告生成完成！")
    print(f"[檔案] {report_file}")
    print(f"[檔案] {output_file}")
    print(f"\n[找到] {len(enriched_employees)} 位員工")
    print("[提示] 請開啟 EMPLOYEE_REPORT.txt 查看完整報告")

if __name__ == '__main__':
    generate_report()
