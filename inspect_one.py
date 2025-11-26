import pandas as pd
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def inspect_file():
    target_file = Path("./ref/工作內容盤點-高上316接頭組.xlsx")
    print(f"🔍 深度檢查檔案: {target_file}")
    
    df = pd.read_excel(target_file, header=None)
    
    print("\n[原始數據矩陣 (Row 0-9, Col 0-15)]")
    print("-" * 80)
    
    # 列印欄位索引
    headers = [f"{i:^10}" for i in range(16)]
    print("      " + "|".join(headers))
    
    for i in range(min(10, len(df))):
        row_str = f"Row {i}: "
        vals = []
        for j in range(min(16, len(df.columns))):
            val = df.iloc[i, j]
            s = str(val).strip()
            if s == "nan": s = ""
            # 截斷過長的字串以便顯示
            if len(s) > 8: s = s[:6] + ".."
            vals.append(f"{s:^10}")
        print(row_str + "|".join(vals))

if __name__ == "__main__":
    inspect_file()


