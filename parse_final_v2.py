import pandas as pd
import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def clean_str(val):
    if pd.isna(val): return ""
    return str(val).strip()

def parse_final(file_path):
    # print(f"處理: {file_path.name}")
    try:
        df = pd.read_excel(file_path, header=None)
        
        # 1. Metadata (Row 2 -> Index 2)
        row_meta = df.iloc[2]
        owner_name = clean_str(row_meta[1])
        owner_id = clean_str(row_meta[5])
        supervisor = clean_str(row_meta[7])
        
        row_dept = df.iloc[3]
        title = clean_str(row_dept[1])
        department = clean_str(row_dept[5])
        
        meta = {
            "name": owner_name,
            "id": owner_id,
            "title": title,
            "department": department,
            "supervisor": supervisor,
            "file": file_path.name
        }

        # 2. 定義欄位 (Based on Row 5 -> Index 5 for Headers/Names)
        row_headers = df.iloc[5]
        
        # 協辦人從 Col 15 開始
        collaborator_map = {} # {col_idx: name}
        for idx in range(15, len(row_headers)):
            val = clean_str(row_headers[idx])
            if val and val not in ["nan", ""]:
                collaborator_map[idx] = val
        
        # 3. 提取任務 (Start from Row 6 -> Index 6)
        tasks = []
        for i in range(6, len(df)):
            row = df.iloc[i]
            
            # 任務名稱在 Col 4
            task_name = clean_str(row[4])
            if not task_name: continue
            
            # 排除非任務行
            if "說明" in task_name or "協辦" in task_name: continue

            # 廠區
            sites = []
            if clean_str(row[0]): sites.append("KS")   # Col 0 = 高獅
            if clean_str(row[1]): sites.append("316")  # Col 1 = 316
            if clean_str(row[2]): sites.append("310")  # Col 2 = 310
            
            # 頻率
            freq = "event_triggered" # 預設
            if clean_str(row[8]): freq = "daily"
            elif clean_str(row[9]): freq = "weekly"
            elif clean_str(row[10]): freq = "monthly"
            elif clean_str(row[14]): freq = "event_triggered"
            
            # 負責人 (預設為表單擁有者)
            default_assignee = owner_name
            backup_assignees = []
            
            # 檢查協辦欄位
            for col_idx, name in collaborator_map.items():
                mark = clean_str(row[col_idx])
                if mark == "●":
                    default_assignee = name
                elif mark == "◎":
                    backup_assignees.append(name)
            
            tasks.append({
                "title": task_name,
                "site": ",".join(sites) if sites else "ALL",
                "frequency": freq,
                "default_assignee": default_assignee,
                "backup_assignees": backup_assignees
            })
            
        return {
            "meta": meta,
            "collaborators_in_sheet": list(collaborator_map.values()),
            "tasks": tasks
        }

    except Exception as e:
        print(f"❌ Error parsing {file_path.name}: {e}")
        return None

def main():
    base_path = Path("./ref")
    files = list(base_path.glob("*.xlsx"))
    
    all_data = []
    all_employees = {} # name -> info
    
    print(f"{'='*60}")
    print(f"{'檔案名稱':<30} | {'擁有者':<8} | {'員編':<6} | {'任務數':<5}")
    print(f"{'-'*60}")

    for f in files:
        res = parse_final(f)
        if res:
            all_data.append(res)
            meta = res["meta"]
            print(f"{meta['file']:<30} | {meta['name']:<8} | {meta['id']:<6} | {len(res['tasks']):<5}")
            
            # 收集擁有者資訊
            if meta["name"]:
                all_employees[meta["name"]] = {
                    "id": meta["id"],
                    "dept": meta["department"],
                    "title": meta["title"],
                    "supervisor": meta["supervisor"],
                    "role": "owner"
                }
            
            # 收集協辦人 (暫無詳細資訊，僅有名稱)
            for name in res["collaborators_in_sheet"]:
                if name not in all_employees:
                    all_employees[name] = {
                        "id": "TBD",
                        "dept": "TBD",
                        "title": "TBD",
                        "role": "collaborator"
                    }

    print(f"\n{'='*60}")
    print(f"🚀 解析完成！共發現 {len(all_employees)} 位員工")
    print(f"{'='*60}")
    
    # 列出所有員工
    for i, (name, info) in enumerate(sorted(all_employees.items()), 1):
        print(f"{i:2d}. {name:<10} (ID: {info['id']:<6}) - {info['dept']}")

    # 儲存最終 JSON
    with open("final_data_package.json", "w", encoding="utf-8") as f:
        json.dump({
            "employees": all_employees,
            "task_matrix": all_data
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 資料已儲存至 final_data_package.json")

if __name__ == "__main__":
    main()


