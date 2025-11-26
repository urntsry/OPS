-- =====================================================
-- THERMOTECH-OPS 完整初始化腳本
-- 一次執行完成：員工 + 密碼 + 任務
-- =====================================================

-- ============ 第 1 步：清空並匯入 79 位員工 ============
DELETE FROM public.daily_assignments;
DELETE FROM public.task_definitions;
DELETE FROM public.profiles;

-- 插入 79 位員工
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('29fc52fe-0972-4f7e-92c7-6dfe81a58bfa', '70004', '梁漢傑', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('ec525d13-907e-41ad-b1be-903308083543', '70012', '王振耀', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('a226ef27-7e24-4494-8c68-1aad52fc2374', '70013', '潘芷菱', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('ade77ba2-9137-4eae-b9a0-2d659ad3f3f9', '70018', '曾世聞', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('b10ee686-c37f-4fc5-9bf1-394c4917f9c9', '70019', '劉育惠', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('00bd3f36-5a29-47e0-ab2b-02bfd779ca93', '70037', '温玲怡', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('dea5be6a-ad8d-4771-a5ea-fc580800f8fe', '70089', '李毓裕', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('fe9c55d8-997b-4422-a5f9-46dac1c52d10', '70170', '黃泰鈞', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('bcd6a3f6-aca5-4c80-a0da-c2e858c190f0', '70231', '古志禹', '管理部', '', 'admin', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('36cb872e-a04a-470a-bd83-4928c5aa106c', '70250', '古振宇', '管理部', '', 'admin', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('533f8843-7c4d-44ce-8362-de76deb39f4e', '70257', '張夢茹', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('8fb95bbe-20ba-425a-8d27-0df81c7f229b', '70292', '吳信宏', '管理部', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('c15b62bd-b357-485d-bd42-d96059c11186', '10003', '張庭憲', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('2514284b-336f-4377-a630-beb65e7c68b4', '10005', '白思恩', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('63c11eed-a764-4b7a-a2de-9399f3ea8069', '10009', '王啓典', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('7fa7b0fb-2124-4144-9691-6b6bb1f8375d', '10014', '潘育昌', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('710e159e-cd16-409b-9da1-92baf3077850', '10235', '黎文祥', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('3626caf9-c7bc-4a27-a4f6-dd614071fe30', '11255', '林龍輝', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('f4c42c41-ef92-44d0-8e85-9daf91713bc4', '11288', '丁春強', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('0203bbb1-6deb-4544-909b-80ab3cda4ad1', '11289', '黎文瑄', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5c972d55-0e0e-41e1-b0b8-0a2927103a7d', '11290', '申黃瓊', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('6bb5e5db-94fa-44a6-99b5-5de6253ab874', '11311', '傅志隆', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('aeba49d1-95d7-496e-9157-4d0617ffd838', '11313', '范揚強', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('45c11683-8269-4962-96e4-d7119f5c1e1f', '11316', '陳曰創', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('e3f68935-6f5b-4f6d-8694-17e89d86af65', '11318', '葉雪梅', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('acd3081e-b963-4622-9dd9-550089da1cfe', '11319', '裴青日', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('8f259cb3-9626-4e6f-8b7f-de8ea0a2894a', '30023', '林珠華', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('cf938f35-2837-46b4-bed7-774947e97b22', '30079', '呂美枝', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('3e242b00-22f0-4b6c-9689-10b3697a7806', '30149', '余宛諭', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5b3649ba-2498-4fc3-8de0-c0ca1db680f6', '30211', '馮氏香', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('2d800ed4-1ded-4dee-8ed1-610f2fc07aac', '50036', '廖柏然', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('3b0720fe-33e9-4064-b877-585b849327a5', '50168', '李家榮', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('f10abfed-f56e-42ae-869a-5f41c2601331', '50215', '裴青心', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('63753621-1346-4ee2-bc77-ea4db52b43ff', '50228', '阮氏河', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('c74f9f16-b3b7-4c27-8f9c-a780b42f6bdd', '52296', '杜氏青', '高上', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('fbaa30e4-084c-4696-8f47-901f9c99055d', '30008', '吳春珠', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('e439dd84-0dcb-48a1-a41c-b52399a9fca3', '30010', '陶玉香', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('f1667960-b1d9-419e-b200-9c3b15022680', '30084', '黃鳳嬌', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('868ecba4-f353-432c-a626-ed2ffa95198c', '30120', '謝秀蘭', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('a4c93258-02b6-416a-8e07-eedcbc2dff84', '30157', '羅玉珍', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5fa00f28-c400-4098-8f98-7397e3c65762', '30181', '劉迎柔', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('eca872be-9d45-446b-939e-0528c22ee5da', '30186', '楊五聯', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('c6ac6551-257b-4fae-ae0b-5ccbc2e22678', '30285', '余婉汝', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('59cd8356-b28c-4cda-97f6-b850540875a4', '30302', '赫巧如', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('33e77a0d-624d-4ca2-b507-7ac663470c73', '30312', '阮氏風', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('adbe0180-b5e7-4c08-a3e0-a9864dc6c241', '30303', '林宜芬', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('e886d333-8bc9-4099-93a8-da5154134055', '30307', '范瑄芸', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('eb9a1ab8-bb3e-4379-bc14-b46527989e1e', '50016', '陳秋琳', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('cf717572-e270-4160-b3c4-2e3579b5cf13', '50022', '梁李菱', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5da610b9-67f4-4800-b026-28cf42e35d40', '50027', '賴小喬', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('c79705a2-0cfe-4641-aa18-5e281e3368d7', '50081', '陳清蘭', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('fae142d0-dbe0-4919-a97e-ba39c4d168f6', '50092', '王永賢', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('b5d8072a-1629-42dc-b21f-fcc6d46357dd', '50106', '徐英傑', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('35eb212f-95a1-4512-8463-3133c528024f', '50119', '白茹豐', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('9a09102c-4ad4-4d0f-bc42-b3a3aae4784b', '50132', '菲利普', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('8071e021-11f6-4318-a2a2-8ed83519cde3', '50144', '范姜群皓', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('eeb144ec-bbdb-4c26-b1b6-f0bd405eb38e', '50150', '尹文林', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('e6ff9b68-ba6f-4cc9-8d6e-807fff81d5d0', '50159', '羅慧婷', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('ea712c04-188f-490b-9204-7eb5d3412601', '50208', '阮國越', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('7dd88fc3-ca51-44eb-ba15-4089717c0822', '50214', '黎國英', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('9d6afac0-a4d9-4603-9097-d1c757619831', '50236', '黎維俊', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('35886ab1-524a-43ce-a7f9-c0ec2da0f434', '50244', '蕭建夆', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('98750360-113a-4ff1-9bdd-90a5bfa307f5', '50245', '林倩芝', '廠務部', '', 'user', 'KS');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('b81cf620-2c6a-440f-872e-5c0d167bc61f', 'A0001', '古杰', '工德', '', 'admin', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5ae6cf49-216e-4e0c-8da6-11e677007643', '70147', '胡廸', '禹碩', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('e61a63a9-b848-470a-84a0-f9a49f6ee81f', '50028', '賴葦蓁', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('a38319af-c141-48b3-9bf3-f7b9b80feda7', '50095', '阮慧喬', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('cfdf0dcd-5816-41af-add2-6d38ff19dee9', '50174', '張麗卿', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('bafd1cf2-246f-44cf-995b-0a5985f99876', '50232', '林怡彣', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('a7b055e6-caa6-4006-8d97-ae572aa637d8', '50238', '黃雯筳', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('ce4b4c26-0b13-4e3c-94ad-facbb751e867', '50247', '阮氏泰娟', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('5104ddbb-0f6f-4629-b753-fd06b2e8fcb4', '52291', '武氏燕', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('46048361-977c-4854-a007-a7acac7fe62e', '52295', '范進士', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('11c91057-c66c-44a5-8c74-3e0ec031c1d6', '52298', '陳逸樺', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('be14e976-b778-42aa-9101-309c0ec84907', '52300', '劉安萱', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('52cafa9f-450e-46f4-bdf5-d9d2e8565ec3', '52314', '宋狄影', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('c6c13c70-ade0-4a6e-8929-1bc79e63de0c', '52315', '楊氏鐘', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('65213327-332f-4cc2-ae7b-b186a44fc59a', '52317', '阮傳奇', '日本', '', 'user', 'ALL');
INSERT INTO public.profiles (id, employee_id, full_name, department, job_title, role, site_code) VALUES ('b86ea162-e745-4878-aea9-5b153c4f1d60', '30074', '金祺庭', '越南', '', 'user', 'ALL');

-- ============ 第 2 步：加入密碼欄位 ============
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Ops2025!';

-- 為管理員設定密碼
UPDATE public.profiles 
SET password = 'Admin369888' 
WHERE employee_id IN ('70231', '70250', 'A0001');

-- ============ 第 3 步：驗證 ============
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_users,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'user') as regular_users,
  (SELECT COUNT(*) FROM public.profiles WHERE password IS NOT NULL) as users_with_password;

-- 檢查關鍵員工（應該只有 3 位 admin）
SELECT employee_id, full_name, role, password 
FROM public.profiles 
WHERE employee_id IN ('70037', '70231', '70250', 'A0001')
ORDER BY employee_id;

