#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel 結構視覺化工具
建立完整的 HTML 報告來檢視 Excel 的原始結構
"""

import pandas as pd
from pathlib import Path

def create_html_visualization(excel_file):
    """為單個 Excel 建立 HTML 視覺化"""
    df = pd.read_excel(excel_file)
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{excel_file.name} - 結構視覺化</title>
    <style>
        body {{ font-family: 'Microsoft JhengHei', Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #008080; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }}
        th {{ background: #008080; color: white; position: sticky; top: 0; }}
        .row-header {{ background: #f0f0f0; font-weight: bold; }}
        .marker {{ background: #ffeb3b; font-weight: bold; }}
        .cell-index {{ background: #e0e0e0; font-size: 10px; }}
    </style>
</head>
<body>
    <h1>{excel_file.name}</h1>
    <p>共 {len(df)} 行 × {len(df.columns)} 欄</p>
    
    <table>
        <tr>
            <th>行號</th>
"""
    
    # 欄位標題（顯示欄位索引）
    for col_idx in range(len(df.columns)):
        html += f"<th class='cell-index'>Col {col_idx}</th>"
    html += "</tr>\n"
    
    # 資料行（前 20 行）
    for row_idx in range(min(20, len(df))):
        row_class = "row-header" if row_idx < 5 else ""
        html += f"<tr><td class='row-header'>Row {row_idx}</td>"
        
        for col_idx in range(len(df.columns)):
            cell_value = df.iloc[row_idx, col_idx]
            cell_str = str(cell_value) if not pd.isna(cell_value) else ""
            
            # 標記特殊符號
            cell_class = "marker" if cell_str in ['●', '◎'] else ""
            
            html += f"<td class='{cell_class}'>{cell_str[:50]}</td>"
        html += "</tr>\n"
    
    html += """
    </table>
</body>
</html>
"""
    
    return html

def main():
    """建立所有 Excel 的 HTML 報告"""
    ref_folder = Path(__file__).parent / 'ref'
    excel_files = sorted(ref_folder.glob('*.xlsx'))
    
    output_folder = Path(__file__).parent / 'excel_visualizations'
    output_folder.mkdir(exist_ok=True)
    
    print(f"[建立] Excel 視覺化報告...")
    
    for excel_file in excel_files:
        print(f"  - {excel_file.name}")
        try:
            html = create_html_visualization(excel_file)
            output_file = output_folder / f"{excel_file.stem}.html"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html)
        except Exception as e:
            print(f"    [錯誤] {str(e)}")
    
    print(f"\n[完成] 視覺化檔案已儲存至: {output_folder}")
    print(f"[提示] 請用瀏覽器開啟 HTML 檔案查看 Excel 結構")

if __name__ == '__main__':
    main()


