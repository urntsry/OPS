#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
THERMOTECH-OPS - Excel 任務資料分析工具
解析所有工作內容盤點檔案，產生完整的員工和任務資料報告
"""

import os
import pandas as pd
from pathlib import Path
import json
from datetime import datetime

def convert_to_serializable(obj):
    """將不可序列化的物件轉換為可序列化格式"""
    if pd.isna(obj):
        return None
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(obj, (pd.Int64Dtype, int)):
        return int(obj)
    return str(obj)

def analyze_excel_file(file_path):
    """分析單個 Excel 檔案"""
    print(f"\n{'='*80}")
    print(f"[檔案] 分析: {os.path.basename(file_path)}")
    print(f"{'='*80}")
    
    try:
        # 讀取 Excel 檔案（自動偵測第一個 sheet）
        df = pd.read_excel(file_path)
        
        print(f"\n[OK] 成功讀取！共 {len(df)} 行資料")
        print(f"\n[欄位] 名稱:")
        for idx, col in enumerate(df.columns, 1):
            print(f"   {idx}. {col}")
        
        print(f"\n[預覽] 前 5 行資料:")
        print("-" * 80)
        try:
            print(df.head(5).to_string())
        except UnicodeEncodeError:
            print("[編碼錯誤] 無法顯示，請查看 JSON 報告")
        
        print(f"\n[統計] 資料統計:")
        print(f"   - 總行數: {len(df)}")
        print(f"   - 總欄位數: {len(df.columns)}")
        
        # 檢查是否有員工/負責人欄位
        possible_name_columns = ['負責人', '姓名', '員工', '執行人', '人員']
        name_column = None
        for col in possible_name_columns:
            if col in df.columns:
                name_column = col
                break
        
        if name_column:
            unique_names = df[name_column].dropna().unique()
            print(f"\n[員工] 發現員工資料（欄位: {name_column}）:")
            print(f"   - 獨特人員數: {len(unique_names)}")
            print(f"   - 人員名單: {', '.join(map(str, unique_names[:10]))}")
            if len(unique_names) > 10:
                print(f"   - ... 以及其他 {len(unique_names) - 10} 人")
        
        return {
            'file_name': os.path.basename(file_path),
            'total_rows': len(df),
            'columns': list(df.columns),
            'sample_data': [[convert_to_serializable(cell) for cell in row] for row in df.head(5).values],
            'employees': [str(name) for name in unique_names] if name_column else []
        }
        
    except Exception as e:
        print(f"[錯誤] {str(e)}")
        return None

def main():
    """主程式"""
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "THERMOTECH-OPS 資料分析工具" + " "*30 + "║")
    print("╚" + "="*78 + "╝")
    
    # 設定 ref 資料夾路徑
    ref_folder = Path(__file__).parent / 'ref'
    
    if not ref_folder.exists():
        print(f"\n[錯誤] 找不到 ref 資料夾: {ref_folder}")
        return
    
    # 找出所有 Excel 檔案
    excel_files = list(ref_folder.glob('*.xlsx'))
    
    if not excel_files:
        print(f"\n[錯誤] ref 資料夾中沒有找到 .xlsx 檔案")
        return
    
    print(f"\n[OK] 找到 {len(excel_files)} 個 Excel 檔案")
    
    # 分析所有檔案
    all_results = []
    all_employees = set()
    all_columns = set()
    
    for excel_file in sorted(excel_files):
        result = analyze_excel_file(excel_file)
        if result:
            all_results.append(result)
            all_employees.update(result.get('employees', []))
            all_columns.update(result.get('columns', []))
    
    # 產生總結報告
    print(f"\n{'='*80}")
    print("[總結報告]")
    print(f"{'='*80}")
    print(f"\n[OK] 成功分析 {len(all_results)}/{len(excel_files)} 個檔案")
    print(f"[OK] 總任務數: {sum(r['total_rows'] for r in all_results)}")
    print(f"[OK] 發現員工總數: {len(all_employees)}")
    
    print(f"\n[員工] 所有員工名單:")
    for idx, name in enumerate(sorted(all_employees), 1):
        print(f"   {idx:2d}. {name}")
    
    print(f"\n[欄位] 所有出現的欄位:")
    for idx, col in enumerate(sorted(all_columns), 1):
        print(f"   {idx:2d}. {col}")
    
    # 儲存 JSON 報告
    output_file = Path(__file__).parent / 'task_analysis_report.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(all_results),
                'total_tasks': sum(r['total_rows'] for r in all_results),
                'total_employees': len(all_employees)
            },
            'employees': sorted(list(all_employees)),
            'all_columns': sorted(list(all_columns)),
            'file_details': all_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n[儲存] 完整報告已儲存至: {output_file}")
    print(f"\n{'='*80}")
    print("[完成] 分析完成！")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    main()

