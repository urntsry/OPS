import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from fpdf import FPDF

pdf_path = r'c:\Users\888\Desktop\HR加班自動比對系統提案.pdf'

# Find a Chinese font
import os
font_path = r'C:\Windows\Fonts\msjh.ttc'  # Microsoft JhengHei
if not os.path.exists(font_path):
    font_path = r'C:\Windows\Fonts\msyh.ttc'  # Microsoft YaHei fallback

class PDF(FPDF):
    def header(self):
        pass
    def footer(self):
        self.set_y(-15)
        self.set_font('chinese', '', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'第 {self.page_no()} 頁', align='C')

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_font('chinese', '', font_path, uni=True)
pdf.add_font('chinese', 'B', font_path, uni=True)

def title(text, size=20):
    pdf.set_font('chinese', 'B', size)
    pdf.set_text_color(26, 82, 118)
    pdf.cell(0, 12, text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(26, 82, 118)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)

def heading2(text):
    pdf.ln(4)
    pdf.set_font('chinese', 'B', 14)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(189, 195, 199)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(4)

def heading3(text):
    pdf.ln(2)
    pdf.set_font('chinese', 'B', 12)
    pdf.set_text_color(52, 73, 94)
    pdf.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

def body(text):
    pdf.set_font('chinese', '', 10)
    pdf.set_text_color(34, 34, 34)
    pdf.multi_cell(0, 6, text)
    pdf.ln(2)

def bold_body(text):
    pdf.set_font('chinese', 'B', 10)
    pdf.set_text_color(34, 34, 34)
    pdf.multi_cell(0, 6, text)
    pdf.ln(2)

def quote(text):
    x = pdf.get_x()
    y = pdf.get_y()
    pdf.set_fill_color(234, 242, 248)
    pdf.set_draw_color(52, 152, 219)
    pdf.set_font('chinese', '', 10)
    pdf.set_text_color(34, 34, 34)
    # Calculate height
    w = pdf.w - pdf.l_margin - pdf.r_margin - 10
    pdf.set_x(x + 10)
    pdf.multi_cell(w, 6, text, fill=True)
    # Draw left border
    pdf.set_draw_color(52, 152, 219)
    pdf.set_line_width(1)
    pdf.line(x + 5, y, x + 5, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(3)

def code_block(text):
    pdf.set_font('chinese', '', 9)
    pdf.set_text_color(50, 50, 50)
    pdf.set_fill_color(245, 245, 245)
    lines = text.split('\n')
    for line in lines:
        pdf.cell(0, 5, '  ' + line, new_x="LMARGIN", new_y="NEXT", fill=True)
    pdf.ln(3)

def table(headers, rows, col_widths=None):
    if col_widths is None:
        n = len(headers)
        available = pdf.w - pdf.l_margin - pdf.r_margin
        col_widths = [available / n] * n
    
    # Header
    pdf.set_font('chinese', 'B', 9)
    pdf.set_fill_color(44, 62, 80)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 7, h, border=1, fill=True, align='C')
    pdf.ln()
    
    # Rows
    pdf.set_font('chinese', '', 9)
    pdf.set_text_color(34, 34, 34)
    for ri, row in enumerate(rows):
        if ri % 2 == 0:
            pdf.set_fill_color(248, 249, 250)
        else:
            pdf.set_fill_color(255, 255, 255)
        for i, cell in enumerate(row):
            pdf.cell(col_widths[i], 7, str(cell), border=1, fill=True)
        pdf.ln()
    pdf.ln(3)

# =========== START CONTENT ===========

pdf.add_page()

# Title
title('加班工時自動比對系統 — 提案說明')

pdf.set_font('chinese', '', 10)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 6, '給：夢茹', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, '日期：2026/06/03', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, '說明：這份文件說明我們規劃的「加班自動比對工具」，', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, '      目的是協助你大幅減少每月人工比對的工作量。', new_x="LMARGIN", new_y="NEXT")
pdf.ln(6)

# === Section 1 ===
heading2('一、我們理解的現況')
heading3('你每月要做的事')

code_block(
"每月流程：\n"
"\n"
"  (1) 從人資系統下載「出勤明細」\n"
"     → 系統自動標記所有打卡 < 8:00 的人為「早到加班 0.5H」\n"
"     → 但很多人只是習慣早到，並沒有真的在加班\n"
"\n"
"  (2) 從生管系統下載「工時統計單」\n"
"     → QR CODE 掃碼時間才能反映員工是否真的開始工作\n"
"     → QR < 8:00 = 確實在加班\n"
"     → QR >= 8:01 = 沒在加班，只是人到了\n"
"\n"
"  (3) 收集紙本「早上加班申請單」\n"
"     → 有主管核章才算正式報加班\n"
"\n"
"  (4) 手動逐筆比對上面三份資料\n"
"     → 每月約 250+ 筆「早到」紀錄需要逐一檢查\n"
"     → 判斷哪些是真正加班、哪些只是習慣早到\n"
"\n"
"  (5) 把確認後的加班時數登記回系統\n"
"\n"
"  (6) 產出最終報表（加班46hr分段）"
)

heading3('目前的痛點')
table(
    ['問題', '說明'],
    [
        ['工作量大', '每月 250+ 筆早到紀錄要逐一比對'],
        ['重複性高', '每月做完全相同的比對動作'],
        ['容易疲勞出錯', '大量數字肉眼比對，漏看或判斷錯很正常'],
        ['核心原因', '出勤系統太「傻」— 打卡<8:00就自動算加班'],
    ],
    [30, 145]
)

# === Section 2 ===
heading2('二、我們能幫你做什麼')
heading3('一句話說明')
quote('你只要上傳兩份 Excel，系統 10 秒內自動完成 95% 的比對工作，\n你只需要確認剩下約 5~10 筆的異常案例。')

heading3('自動化前 vs 自動化後')
table(
    ['項目', '現在（手動）', '以後（自動）'],
    [
        ['你要比對的筆數', '250+ 筆', '5~10 筆'],
        ['每月花費時間', '數小時', '10~15 分鐘'],
        ['你的角色', '資料處理者（逐筆比對）', '審核確認者（只看異常）'],
        ['報表產出', '手動整理 Excel', '系統自動產出'],
        ['錯誤風險', '肉眼容易漏', '規則一致，不會遺漏'],
    ],
    [30, 60, 80]
)

# === Section 3 ===
pdf.add_page()
heading2('三、系統怎麼運作')
heading3('你每月只要做 4 步')

code_block(
"步驟 1  從人資系統下載「原始出勤明細」（月初固定動作）\n"
"步驟 2  從生管系統下載「工時統計單」（月初固定動作）\n"
"步驟 3  把兩份檔案上傳到 OPS 系統\n"
"步驟 4  確認少數異常案例 → 完成"
)

heading3('系統自動做的事')

code_block(
"上傳出勤明細 + 上傳工時統計單\n"
"        |\n"
"  系統自動比對\n"
"        |\n"
"  比對結果分三類：\n"
"\n"
"  [V] 自動通過：QR < 8:00 + 出勤早到 → 確認為早班加班\n"
"      （不用管，系統直接算）\n"
"\n"
"  [X] 自動排除：QR >= 8:00 但出勤有早到 → 只是習慣早到\n"
"      （不用管，系統自動排除）\n"
"\n"
"  [!] 待確認：邊界案例（QR 剛好 8:00~8:05）\n"
"      （只需要看這幾筆，通常 5~10 筆以內）"
)

# === Section 4 ===
heading2('四、判定規則說明')
heading3('早班加班（8:00~8:30 時段）')

code_block(
"判定條件：\n"
"  (1) 出勤打卡 < 08:00（人有到）\n"
"  (2) QR CODE < 08:00（確實開始工作）\n"
"  (3) 以上兩者都成立 → 算 0.5H 早班加班\n"
"\n"
"排除條件：\n"
"  → 出勤打卡 < 08:00，但 QR CODE >= 08:00\n"
"  → 代表人雖然到了，但沒有真的開始工作\n"
"  → 系統自動排除，不算加班"
)

heading3('案例 A — 小安 (賴葦蓁 50028) 4/13：算加班 [V]')
code_block(
"出勤打卡：07:44  ← 人到了\n"
"QR CODE： 07:56  ← 開始工作了（< 8:00）\n"
"結果：算 0.5H 早班加班\n"
"日工時小計：8.0 + 0.5 = 8.5"
)

heading3('案例 B — 陶阿姨 (陶玉香 30010) 4/13：不算加班 [X]')
code_block(
"出勤打卡：07:4x  ← 人到了\n"
"QR CODE： 08:08  ← 8點多才開始工作(>= 8:00)\n"
"結果：不算加班，系統自動排除\n"
"（出勤系統會跳 0.5H，但這是錯誤的）"
)

heading3('案例 C — 邊界案例：待確認 [!]')
code_block(
"出勤打卡：07:50  ← 人到了\n"
"QR CODE： 08:02  ← 差 2 分鐘超過 8:00\n"
"結果：系統標記「待確認」，由你判斷\n"
"（可能是不小心晚刷）"
)

heading3('晚班加班（18:00 以後）')
code_block(
"判定條件：\n"
"  → 出勤下班打卡 > 18:00\n"
"  → 加班時數 = 下班時間 - 18:00\n"
"  → 不需要加班申請單\n"
"\n"
"分級計算：\n"
"  → 18:00 ~ 20:00 = 平日加班 1-2H\n"
"  → 20:00 ~ 22:00 = 平日加班 3-4H\n"
"  → 超過 22:00    = 平日加班 >4H\n"
"\n"
"假日加班：\n"
"  → 休息日/例假日有出勤 = 依實際工時計算"
)

# === Section 5 ===
pdf.add_page()
heading2('五、實際數據驗證（四月份）')
body('我們用四月份的真實資料做了自動比對測試：')

heading3('測試結果')
table(
    ['統計項目', '數字'],
    [
        ['四月份總「早到」紀錄', '250+ 筆'],
        ['系統自動排除（QR >= 8:00）', '87 筆'],
        ['系統自動通過（QR < 8:00）', '約 160 筆'],
        ['需要人工確認的邊界案例', '約 3~10 筆'],
    ],
    [90, 80]
)

bold_body('→ 夢茹的工作量從每月 250 筆 → 降到 10 筆以內')

heading3('自動排除的典型員工（四月份）')
table(
    ['員工', '早到天數', 'QR 通常幾點掃', '判定'],
    [
        ['30010 陶玉香', '17天', '08:04 ~ 08:20', '全部排除'],
        ['30303 林宜芬', '20天', '08:21 ~ 08:29', '全部排除'],
        ['30084 黃鳳嬌', '20天', '08:07 ~ 08:15', '全部排除'],
        ['50144 范姜群皓', '19天', '08:25 ~ 08:30', '大部分排除'],
    ],
    [40, 25, 40, 60]
)
body('以上員工每天都早到打卡，但 QR CODE 都是 8 點多才掃。出勤系統每天都跳「加班 0.5H」，但其實都不是加班。以前需要一筆一筆看，以後系統直接幫你排除。')

heading3('確認有效加班的員工（四月份）')
table(
    ['員工', 'QR < 8:00 天數', '說明'],
    [
        ['50095 阮慧喬', '27天', '確實很早開始工作'],
        ['52317 阮傳奇', '32天', '確實很早開始工作'],
        ['50247 阮氏泰娟', '27天', '確實很早開始工作'],
        ['50028 賴葦蓁', '4天', '部分天數有早班加班'],
    ],
    [45, 40, 80]
)

# === Section 6 ===
heading2('六、最終報表')
body('系統會自動產出跟你目前做的「加班46hr分段」完全相同格式的報表：')

code_block(
"產出內容：\n"
"\n"
"  報表一：月加班摘要（所有人）\n"
"    → 編號、姓名、加總、加班I、加班II、超時Y/N\n"
"    → 格式同現在的「時數計算」第一頁\n"
"\n"
"  報表二：個人加班明細（每人一頁）\n"
"    → 日期、起迄、工單、客戶、時數、加班分級\n"
"    → 格式同現在每人的個別分頁\n"
"\n"
"  報表三：異常紀錄（附加參考）\n"
"    → 列出所有被排除的「假加班」紀錄\n"
"    → 方便稽核或回答員工疑問"
)

# === Section 7 ===
pdf.add_page()
heading2('七、需要你協助確認的問題')

heading3('Q1：「不小心晚刷 8:01」怎麼處理？')
body('如果員工確實有報加班，但 QR CODE 不小心刷到 8:01~8:05 之間：')
code_block(
"(A) 嚴格按 QR CODE：超過 8:00 就不算，不管有沒有申請\n"
"(B) 設一個緩衝區：8:05 以內如果有加班申請就算\n"
"(C) 列為「待確認」讓你自己判斷"
)
body('→ 你平常是怎麼處理的？')

heading3('Q2：晚班加班從幾點開始算？')
code_block(
"(A) 從 18:00 開始算（17:30~18:00 那半小時不算加班）\n"
"(B) 從 17:30 下班後就開始算\n"
"(C) 其他算法？"
)

heading3('Q3：原始出勤明細')
body('系統需要的是「你還沒有登記加班之前」的原始版本。請確認：')
code_block(
"• 這份檔案每月固定可以下載嗎？\n"
"• 是在什麼時間點下載的才是原始版？\n"
"• 可以提供一份「空白」的出勤明細給我們看格式嗎？"
)

heading3('Q4：報表格式')
body('目前系統會產出跟「加班46hr分段」相同格式的報表。')
code_block(
"• 這個格式 OK 嗎？\n"
"• 有沒有想要增加或減少的欄位？\n"
"• 還是維持現有格式就好？"
)

# === Section 8 ===
heading2('八、整體效益')
table(
    ['項目', '以前', '以後'],
    [
        ['工作量', '每月花數小時逐筆比對', '10~15分鐘上傳+確認'],
        ['比對筆數', '250+ 筆', '只看 5~10 筆異常'],
        ['準確度', '人眼疲勞可能漏看', '規則一致不遺漏'],
        ['報表產出', '手動整理Excel', '一鍵自動匯出'],
        ['可追溯性', '沒有紀錄', '有完整比對紀錄可查'],
    ],
    [30, 67, 67]
)

# === Section 9 ===
heading2('九、下一步')

code_block(
"1. 請回答上面 Q1~Q4 的問題\n"
"2. 請提供一份「原始出勤明細」（還沒登記加班的版本）\n"
"3. 我們開始建置，預計 1~2 週可以上線第一版\n"
"4. 上線後你試用一個月，有問題我們再調整"
)

pdf.ln(8)
quote('核心理念：讓你從「資料處理者」變成「審核確認者」。\n重複性的比對交給系統，你專注在需要判斷力的少數案例上。')

pdf.ln(8)
body('如有任何問題或想法，隨時跟我們說！')

# Save
pdf.output(pdf_path)
print(f'PDF generated successfully: {pdf_path}')
