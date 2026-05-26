ALTER TABLE operator_catalog ADD COLUMN category_group VARCHAR(64) DEFAULT 'GENERAL' NOT NULL;
ALTER TABLE operator_catalog ADD COLUMN sub_category VARCHAR(64);
ALTER TABLE operator_catalog ADD COLUMN data_type VARCHAR(64) DEFAULT 'IMAGE' NOT NULL;
ALTER TABLE operator_catalog ADD COLUMN supports_preview BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE operator_catalog ADD COLUMN enhancement_mode VARCHAR(64);
ALTER TABLE operator_catalog ADD COLUMN default_output_dataset_data_type VARCHAR(64);
ALTER TABLE operator_catalog ADD COLUMN annotation_risk_level VARCHAR(32) DEFAULT 'LOW' NOT NULL;

ALTER TABLE pipeline_definition ADD COLUMN template_code VARCHAR(96);
ALTER TABLE pipeline_definition ADD COLUMN source_dataset_id VARCHAR(96);
ALTER TABLE pipeline_definition ADD COLUMN source_version_id VARCHAR(96);
ALTER TABLE pipeline_definition ADD COLUMN source_dataset_data_type VARCHAR(64);

UPDATE operator_catalog SET
    category_group='GENERAL',
    sub_category=COALESCE(sub_category, 'GENERAL'),
    data_type=CASE WHEN category='图像处理' THEN 'IMAGE' ELSE 'IMAGE' END,
    supports_preview=FALSE,
    default_output_dataset_data_type=CASE WHEN category='图像处理' THEN 'IMAGE' ELSE 'IMAGE' END,
    annotation_risk_level='LOW'
WHERE category_group IS NULL OR category_group='GENERAL';

INSERT INTO operator_catalog (operator_id, name, category_group, category, sub_category, data_type, stage, kind, tenant_id, description, parameter_schema_json, input_schema_json, output_schema_json, endpoint, credential_ref, timeout_seconds, concurrency_limit, status, version, before_example, after_example, usage_count, pipeline_count, error_rate, enhancement_mode, default_output_dataset_data_type, annotation_risk_level, created_by, created_at, updated_at, supports_preview)
VALUES
    ('OP-IMG-WATERMARK', '图片加水印', 'VISUAL_PREPROCESS', '图片处理', 'WATERMARK', 'IMAGE', '预处理', 'BUILTIN', NULL, '添加预览水印或产物水印；进入标注链路默认关闭产物水印', '{"required":["previewWatermarkEnabled","artifactWatermarkEnabled"],"properties":{"previewWatermarkEnabled":{"type":"boolean","default":true},"artifactWatermarkEnabled":{"type":"boolean","default":false},"watermarkText":{"type":"string"},"position":{"type":"string","enum":["TOP_LEFT","TOP_RIGHT","BOTTOM_LEFT","BOTTOM_RIGHT","CENTER"]},"opacity":{"type":"number","minimum":0.1,"maximum":1.0}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '原始工业图片', '预览叠加水印或产物写入水印', 126, 8, 0.01, NULL, 'IMAGE', 'MEDIUM', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-IMG-ENHANCE', '图片质量提高', 'VISUAL_PREPROCESS', '图片处理', 'QUALITY_ENHANCEMENT', 'IMAGE', '预处理', 'BUILTIN', NULL, '一期仅支持锐化、去噪、亮度/对比度优化等传统增强', '{"required":["enhancementMode"],"properties":{"enhancementMode":{"type":"string","enum":["TRADITIONAL_ONLY"]},"sharpen":{"type":"boolean","default":true},"denoise":{"type":"boolean","default":true},"brightnessContrastOptimize":{"type":"boolean","default":true}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '模糊低质量图片', '传统增强后的工业图片', 98, 6, 0.01, 'TRADITIONAL_ONLY', 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-IMG-DENOISE', '图片去噪', 'VISUAL_PREPROCESS', '图片处理', 'DENOISE', 'IMAGE', '预处理', 'BUILTIN', NULL, '移除工业图像噪点', '{"type":"object","properties":{"strength":{"type":"number","default":0.4}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '高噪点图片', '噪点降低后的图片', 64, 4, 0.01, NULL, 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-IMG-SHARPEN', '图片锐化', 'VISUAL_PREPROCESS', '图片处理', 'SHARPEN', 'IMAGE', '预处理', 'BUILTIN', NULL, '提升图像边缘清晰度', '{"type":"object","properties":{"strength":{"type":"number","default":0.6}}}', '{"dataType":"IMAGE"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '边缘模糊图片', '锐化后的图片', 61, 4, 0.01, NULL, 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-FRAME-EXTRACT', '固定间隔抽帧', 'VISUAL_PREPROCESS', '视频处理', 'FRAME_EXTRACTION', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '按固定时间间隔提取图片帧', '{"required":["mode","intervalSeconds"],"properties":{"mode":{"type":"string","enum":["FIXED_INTERVAL"]},"intervalSeconds":{"type":"integer","minimum":1},"outputImageFormat":{"type":"string","default":"JPG"}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '原始工业视频', '按固定间隔抽取的图片帧', 88, 5, 0.01, NULL, 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-FPS-EXTRACT', '固定帧率抽帧', 'VISUAL_PREPROCESS', '视频处理', 'FRAME_EXTRACTION', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '按目标帧率提取图片帧', '{"required":["mode","targetFps"],"properties":{"mode":{"type":"string","enum":["FIXED_FPS"]},"targetFps":{"type":"integer","minimum":1},"outputImageFormat":{"type":"string","default":"JPG"}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '原始工业视频', '按固定帧率抽取的图片帧', 74, 5, 0.01, NULL, 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-KEYFRAME', '关键帧提取', 'VISUAL_PREPROCESS', '视频处理', 'FRAME_EXTRACTION', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '提取关键帧，优先级次于固定间隔/固定帧率抽帧', '{"required":["mode"],"properties":{"mode":{"type":"string","enum":["KEYFRAME"]}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"IMAGE"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '原始工业视频', '关键帧图片集合', 32, 2, 0.01, NULL, 'IMAGE', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-SEGMENT', '视频分段', 'VISUAL_PREPROCESS', '视频处理', 'SEGMENT', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '按时长切分视频', '{"required":["segmentSeconds"],"properties":{"segmentSeconds":{"type":"integer","minimum":1}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"AUDIO_VIDEO"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '长视频', '分段后视频片段', 28, 2, 0.01, NULL, 'AUDIO_VIDEO', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-RESOLUTION-UNIFY', '分辨率统一', 'VISUAL_PREPROCESS', '视频处理', 'RESOLUTION_UNIFY', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '统一视频分辨率', '{"required":["width","height"],"properties":{"width":{"type":"integer"},"height":{"type":"integer"}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"AUDIO_VIDEO"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '不同分辨率视频', '统一分辨率视频', 23, 1, 0.01, NULL, 'AUDIO_VIDEO', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE),
    ('OP-VIDEO-FPS-UNIFY', '帧率统一', 'VISUAL_PREPROCESS', '视频处理', 'FPS_UNIFY', 'AUDIO_VIDEO', '预处理', 'BUILTIN', NULL, '统一视频帧率', '{"required":["targetFps"],"properties":{"targetFps":{"type":"integer","minimum":1}}}', '{"dataType":"AUDIO_VIDEO"}', '{"dataType":"AUDIO_VIDEO"}', NULL, NULL, NULL, NULL, 'PUBLISHED', '1.0.0', '不同帧率视频', '统一帧率视频', 21, 1, 0.01, NULL, 'AUDIO_VIDEO', 'LOW', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE);

UPDATE operator_catalog SET
    category_group='VISUAL_PREPROCESS',
    sub_category='RESIZE',
    data_type='IMAGE',
    supports_preview=TRUE,
    default_output_dataset_data_type='IMAGE',
    annotation_risk_level='LOW'
WHERE operator_id='OP-IMAGE-RESIZE';

UPDATE operator_catalog SET
    category_group='VISUAL_PREPROCESS',
    sub_category='FORMAT_CONVERT',
    data_type='IMAGE',
    supports_preview=TRUE,
    default_output_dataset_data_type='IMAGE',
    annotation_risk_level='LOW'
WHERE operator_id='OP-FORMAT-CONVERT';

UPDATE pipeline_definition
SET template_code='IMAGE_PREPROCESS',
    source_dataset_id='DATASET-WELD-DEFECT',
    source_version_id='DVER-WELD-001',
    source_dataset_data_type='IMAGE'
WHERE pipeline_id='PIPE-IMG-PREP';

INSERT INTO pipeline_definition (pipeline_id, name, tenant_id, project_id, status, current_version_id, owner_id, description, diagnostic_code, diagnostic_message, created_at, updated_at, template_code, source_dataset_id, source_version_id, source_dataset_data_type)
VALUES ('PIPE-VIDEO-PREP', '焊缝视频抽帧预处理', 'TENANT-CABIN', NULL, 'VALIDATED', NULL, 'USR-ADMIN', '视频抽帧并统一图片尺寸的视觉预处理 Pipeline', 'OK', 'VISUAL_PREPROCESS_PIPELINE_VALID', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'VIDEO_FRAME_TO_IMAGE_PREPROCESS', 'DATASET-WELD-VIDEO-001', 'DVER-WELD-VIDEO-001', 'AUDIO_VIDEO');

INSERT INTO dataset (dataset_id, name, dataset_type, data_type, tenant_id, project_id, current_version_id, status, access_level, tags, record_count, size_bytes, owner_id, description, created_at, updated_at)
SELECT 'DATASET-WELD-VIDEO-001', '焊缝视频巡检数据集', 'RAW', 'AUDIO_VIDEO', 'TENANT-CABIN', NULL, NULL, 'ACTIVE', 'TEAM', '焊接,视频,巡检,工业视觉', 12, 4096, 'USR-ADMIN', '焊缝视频原始样例数据集', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset WHERE dataset_id='DATASET-WELD-VIDEO-001');

INSERT INTO dataset_version (version_id, dataset_id, version_name, status, record_count, size_bytes, content_safety_status, diagnostic_code, diagnostic_message, created_by, created_at, published_at)
SELECT 'DVER-WELD-VIDEO-001', 'DATASET-WELD-VIDEO-001', 'v1.0.0', 'PUBLISHED', 12, 4096, 'PASSED', 'OK', 'SANDBOX_CONTENT_SAFETY_PASSED', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM dataset_version WHERE version_id='DVER-WELD-VIDEO-001');

UPDATE dataset SET current_version_id='DVER-WELD-VIDEO-001' WHERE dataset_id='DATASET-WELD-VIDEO-001';

INSERT INTO pipeline_node (node_id, pipeline_id, operator_id, label, position_x, position_y, config_json, status, created_at, updated_at) VALUES
    ('read-video', 'PIPE-VIDEO-PREP', 'OP-READ-DATASET', '读取焊缝视频数据集', 80, 150, '{"datasetId":"DATASET-WELD-VIDEO-001"}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('extract', 'PIPE-VIDEO-PREP', 'OP-VIDEO-FRAME-EXTRACT', '固定间隔抽帧', 320, 150, '{"mode":"FIXED_INTERVAL","intervalSeconds":2,"outputImageFormat":"JPG"}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('resize', 'PIPE-VIDEO-PREP', 'OP-IMAGE-RESIZE', '图片缩放', 560, 150, '{"width":1280,"height":720,"keepAspectRatio":true}', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pipeline_edge (edge_id, pipeline_id, source_node_id, target_node_id, edge_type, created_at) VALUES
    ('EDGE-video-read-extract', 'PIPE-VIDEO-PREP', 'read-video', 'extract', 'DATA', CURRENT_TIMESTAMP),
    ('EDGE-video-extract-resize', 'PIPE-VIDEO-PREP', 'extract', 'resize', 'DATA', CURRENT_TIMESTAMP);

INSERT INTO pipeline_version (version_id, pipeline_id, version_name, note, dag_json, created_by, created_at)
VALUES ('PVER-VIDEO-PREP-001', 'PIPE-VIDEO-PREP', 'v1.0', '视频抽帧预处理初始版本', '{"nodes":3,"edges":2,"variables":0}', 'USR-ADMIN', CURRENT_TIMESTAMP);

UPDATE pipeline_definition SET current_version_id='PVER-VIDEO-PREP-001' WHERE pipeline_id='PIPE-VIDEO-PREP';
