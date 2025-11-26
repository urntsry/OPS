-- =====================================================
-- 匯入 98 個任務（不綁定負責人）
-- 執行前請確保：
-- 1. 已執行 update_all_employees.sql (79 位員工)
-- 2. 已加入 password 欄位
-- =====================================================

-- 清空任務（保留員工）
DELETE FROM public.daily_assignments;
DELETE FROM public.task_definitions;

-- 插入 98 個任務（不綁定負責人）
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('理布', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('產品縫製/開發', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('人員訓練/管理', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('生產線產品檢查', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('填寫內外皮QC檢驗表', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('日用品採購', 'monthly', 100, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('手縫針管理', 'daily', 10, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('環境清潔督導', 'weekly', 50, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('3D模子管理', 'weekly', 50, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('設備保養', 'weekly', 50, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('生產進度回報', 'weekly', 50, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('產品模子拍照給日本確認', 'weekly', 50, 'ALL', '工作內容盤點-310電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('國內應收帳款核對/沖銷', 'daily', 10, 'KS,316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('國內應付帳款核對/匯款', 'daily', 10, 'KS,316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('辦公室設備修繕/更換', 'event_triggered', 20, 'KS', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('掃辦公室廁所', 'weekly', 50, 'KS', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('職工福利委員會會議召集/帳務彙整', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('職工福利委員會年度預算/決算/稅務申報', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('跑銀行', 'weekly', 50, 'KS', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('繳納電費/電話費', 'monthly', 100, '316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('公務車etag儲值', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-業務部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('與客戶洽談業務', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('報價單填寫', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('與廠商詢價', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('加工單開立', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('外出洽談業務', 'weekly', 50, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('外出施工', 'weekly', 50, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('送貨', 'weekly', 50, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('出貨處理', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('採購配件', 'weekly', 50, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('現場協調及解釋工單內容', 'daily', 10, '316', '工作內容盤點-管理部.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('出勤核對加班/請假簽核', 'daily', 10, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('支援主管交辦事項,加工單產線進度,控管生產排程', 'daily', 10, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('外出施工人員安全衛生管理', 'daily', 10, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('品質異常處理與改善', 'monthly', 100, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('巡查機具設備使用狀況', 'daily', 10, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工廠日常用品、五金零件採購', 'daily', 10, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('新進員工生產教育訓練', 'event_triggered', 20, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工廠機台輔助工具製作', 'daily', 10, 'KS,316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('監視系統保養維護', 'monthly', 100, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('廠房配備箱巡查保養', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('頂樓太陽能板清洗保養', 'event_triggered', 20, 'KS', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('發電機(ATS)保養', 'monthly', 100, 'KS,316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('智能機台保養', 'weekly', 50, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('空壓機保養', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('飲水機保養', 'monthly', 100, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('事業生活廢棄物清運', 'weekly', 50, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('棉毯下腳料整理分類清運', 'event_triggered', 20, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('布類下腳料及板材清運', 'event_triggered', 20, '316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('化糞池抽肥', 'event_triggered', 20, 'KS', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('公務車定期檢驗保養', 'event_triggered', 20, 'KS,316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('2.8T天車保養', 'monthly', 100, 'KS,316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('冷氣冷卻水塔清洗', 'monthly', 100, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('貨梯保養(電梯)', 'monthly', 100, 'KS', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('空調冷氣保養', 'event_triggered', 20, 'KS', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('廠房鐵捲門/大門保養', 'monthly', 100, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('消防設備保養/檢查/申報', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('移工勞動部訪查', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工廠加工設備/修繕更換', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('高上廠納管/改善計畫', 'event_triggered', 20, '316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('高上廠員工停車場管理', 'event_triggered', 20, '316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('高上廠房承租窗口', 'monthly', 100, '316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('ISO審核/廠務部', 'event_triggered', 20, 'KS,316', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('防颱措施事項', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('廠房內外環境驅蟲/消毒', 'monthly', 100, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工廠水電維修', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高上316接頭組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('環境打掃', 'weekly', 50, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('發工單製作內容', 'daily', 10, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('檢查每工單布料', 'daily', 10, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('領線/布/棉等', 'weekly', 50, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('做完工單檢查QC', 'weekly', 50, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('教新人車縫', 'daily', 10, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('針車保養,冷氣保養', 'weekly', 50, '316', '工作內容盤點-高上316車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工單內容製作', 'daily', 10, 'KS', '工作內容盤點-高獅車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('打掃環境', 'weekly', 50, 'KS', '工作內容盤點-高獅車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('機台保養', 'weekly', 50, 'KS', '工作內容盤點-高獅車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('教育訓練', 'event_triggered', 20, 'KS', '工作內容盤點-高獅車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('參與福委會議', 'event_triggered', 20, 'KS', '工作內容盤點-高獅車縫布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('現場工作進度追蹤', 'daily', 10, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('現場工作安排協調', 'daily', 10, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('工單內容製作', 'daily', 10, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('各組支援', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('外出施工', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('修理針車', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('更換飲水機濾芯', 'monthly', 100, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('冷氣清洗', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('整理回收', 'monthly', 100, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('現場工作環境整理', 'monthly', 100, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('現場設備修繕/更換', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('防颱準備', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('新進同仁教育訓練', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('ISO內部稽核人員', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('設備盤點', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('下午茶安排', 'monthly', 100, 'KS,316,310', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('活動安排策劃', 'event_triggered', 20, 'KS,316,310', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('掃廁所', 'weekly', 50, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('調節組員自身相關問題', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');
INSERT INTO public.task_definitions (title, frequency, base_points, site_location, source_file) VALUES ('參與福委會', 'event_triggered', 20, 'KS', '工作內容盤點-高獅電熱布包組.xlsx');

-- 驗證
SELECT COUNT(*) as total_tasks FROM public.task_definitions;
SELECT frequency, COUNT(*) as count FROM public.task_definitions GROUP BY frequency ORDER BY frequency;