import pandas as pd
import sys
import json
import os
from pathlib import Path

# 強制設定標準輸出為 UTF-8，解決 Windows 終端機亂碼問題
sys.stdout.reconfigure(encoding='utf-8')

def clean_str(val):
    """清理字串，處理 NaN 和空白"""
    if pd.isna(val):
        return ""
    return str(val).strip()

def is_chinese_name(text):
    """簡單判斷是否為中文人名 (2-4 字，非關鍵字)"""
    text = clean_str(text)
    if not text: return False
    if len(text) < 2 or len(text) > 4: return False
    keywords = ['說明', '頻率', '備註', '地點', '主辦', '協辦', '項目', '內容', '每日', '每周', '每月', '合計', 'Unnamed']
    for kw in keywords:
        if kw in text: return False
    return True

def parse_excel_gemini_mode(file_path):
    print(f"\n{'='*50}")
    print(f"📂 正在讀取: {file_path.name}")
    
    try:
        # 讀取原始資料，不預設 header，讓我們自己控制
        df = pd.read_excel(file_path, header=None)
        
        # 1. 解析表頭 Metadata (Row 1 & 2 -> Index 1 & 2)
        # ==========================================
        meta_info = {"file": file_path.name}
        
        # 掃描第 2 列 (Index 1) 找 姓名/員工編號/職稱
        row_1 = df.iloc[1]
        for i, cell in enumerate(row_1):
            val = clean_str(cell)
            if val == "姓名" and i+1 < len(row_1):
                meta_info["main_owner_name"] = clean_str(row_1[i+1])
            elif val == "員工編號" and i+1 < len(row_1):
                # 嘗試處理浮點數編號
                raw_id = row_1[i+1]
                if pd.notna(raw_id):
                    try:
                        meta_info["main_owner_id"] = str(int(float(raw_id)))
                    except:
                        meta_info["main_owner_id"] = str(raw_id)
            elif val == "職稱" and i+1 < len(row_1):
                meta_info["main_owner_title"] = clean_str(row_1[i+1])
            elif val == "部門" and i+1 < len(row_1):
                meta_info["department"] = clean_str(row_1[i+1])
                
        # 掃描第 3 列 (Index 2) 補充資料 (有些表單部門在這一列)
        row_2 = df.iloc[2]
        for i, cell in enumerate(row_2):
            val = clean_str(cell)
            if val == "部門" and "department" not in meta_info and i+1 < len(row_2):
                meta_info["department"] = clean_str(row_2[i+1])
        
        print(f"👤 表單負責人: {meta_info.get('main_owner_name', '未找到')} (ID: {meta_info.get('main_owner_id', '未找到')})")

        # 2. 定位關鍵欄位 (Row 4 -> Index 3)
        # ==========================================
        header_row_idx = 3
        if len(df) <= header_row_idx:
            print("❌ 錯誤: 檔案行數不足")
            return None

        header_row = df.iloc[header_row_idx]
        
        col_map = {
            "task_name": -1,
            "freq_daily": -1,
            "freq_weekly": -1,
            "freq_monthly": -1,
            "freq_event": -1,
            "location_316": -1,
            "location_310": -1,
            "location_ks": -1
        }
        
        collaborators = {} # {col_index: name}

        print("🔍 掃描欄位標題 (Row 4)...")
        for idx, cell in enumerate(header_row):
            val = clean_str(cell)
            
            # 任務名稱 (通常在前面)
            if "工作內容" in val or "作業項目" in val:
                col_map["task_name"] = idx
            
            # 頻率欄位
            if "每日" in val: col_map["freq_daily"] = idx
            if "每週" in val or "每周" in val: col_map["freq_weekly"] = idx
            if "每月" in val: col_map["freq_monthly"] = idx
            if "事件" in val or "不固定" in val: col_map["freq_event"] = idx
            
            # 協辦人 (這就是您說的 22 位員工的來源)
            # 邏輯: 如果是中文人名，且不在我們已知的關鍵字內，就是員工
            if is_chinese_name(val):
                collaborators[idx] = val

        # 補充掃描第 5 列 (Index 4) 找地點 (#316, #310)
        loc_row = df.iloc[4]
        for idx, cell in enumerate(loc_row):
            val = clean_str(cell)
            if "316" in val: col_map["location_316"] = idx
            if "310" in val: col_map["location_310"] = idx
            if "高獅" in val or "KS" in val: col_map["location_ks"] = idx

        # 如果沒找到任務名稱欄位，預設為第 0 欄
        if col_map["task_name"] == -1:
            col_map["task_name"] = 0

        print(f"🎯 任務名稱欄位: {col_map['task_name']}")
        print(f"👥 發現潛在協辦人/員工欄位: {list(collaborators.values())}")

        # 3. 提取任務資料 (從 Row 6 -> Index 5 開始)
        # ==========================================
        tasks = []
        start_row = 5
        
        for i in range(start_row, len(df)):
            row = df.iloc[i]
            
            # 獲取任務名稱
            task_name = clean_str(row[col_map["task_name"]])
            
            # 跳過無效行
            if not task_name or task_name in ["nan", "None", "", "說明", "Freq"]:
                continue
            # 跳過僅包含 "說明:" 的行
            if task_name.startswith("說明") or "主辦→" in task_name:
                continue

            # 頻率判定
            freqs = []
            if col_map["freq_daily"] != -1 and clean_str(row[col_map["freq_daily"]]): freqs.append("daily")
            if col_map["freq_weekly"] != -1 and clean_str(row[col_map["freq_weekly"]]): freqs.append("weekly")
            if col_map["freq_monthly"] != -1 and clean_str(row[col_map["freq_monthly"]]): freqs.append("monthly")
            if col_map["freq_event"] != -1 and clean_str(row[col_map["freq_event"]]): freqs.append("event_triggered")
            
            # 地點判定
            sites = []
            if col_map["location_316"] != -1 and clean_str(row[col_map["location_316"]]): sites.append("316")
            if col_map["location_310"] != -1 and clean_str(row[col_map["location_310"]]): sites.append("310")
            if col_map["location_ks"] != -1 and clean_str(row[col_map["location_ks"]]): sites.append("KS")
            
            # 權責判定 (主辦 vs 協辦)
            main_assignee = meta_info.get("main_owner_name") # 預設表單負責人
            backup_assignees = []
            
            # 檢查右側協辦人欄位
            for col_idx, emp_name in collaborators.items():
                val = clean_str(row[col_idx])
                if val == "●": # 主辦
                    main_assignee = emp_name
                elif val == "◎": # 協辦
                    backup_assignees.append(emp_name)

            tasks.append({
                "title": task_name,
                "frequency": freqs[0] if freqs else "event_triggered", # 預設
                "site": ",".join(sites) if sites else "ALL",
                "default_assignee": main_assignee,
                "backup_assignees": backup_assignees
            })

        print(f"✅ 提取到 {len(tasks)} 個任務")
        return {
            "meta": meta_info,
            "collaborators": list(collaborators.values()),
            "tasks": tasks
        }

    except Exception as e:
        print(f"❌ 解析失敗: {e}")
        return None

def main():
    base_path = Path("./ref")
    files = list(base_path.glob("*.xlsx"))
    
    if not files:
        print("找不到 xlsx 檔案")
        return

    all_data = []
    all_employees = set()

    for f in files:
        res = parse_excel_gemini_mode(f)
        if res:
            all_data.append(res)
            if res["meta"].get("main_owner_name"):
                all_employees.add(res["meta"]["main_owner_name"])
            for emp in res["collaborators"]:
                all_employees.add(emp)

    print(f"\n{'='*50}")
    print("🚀 GEMINI 3 PRO 解析總結")
    print(f"{'='*50}")
    print(f"總共發現員工: {len(all_employees)} 位")
    print(f"名單: {', '.join(sorted(list(all_employees)))}")
    
    # 儲存結果供後續使用
    with open("gemini_parsed_result.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()


