-- Align F009/F012 code contracts with the 2026-05-20 scoped dataset and annotation rules.

ALTER TABLE annotation_dataset_publication
    ADD COLUMN IF NOT EXISTS annotation_artifact_file_id VARCHAR(96);

ALTER TABLE annotation_dataset_publication
    ADD COLUMN IF NOT EXISTS annotation_artifact_role VARCHAR(64);

ALTER TABLE annotation_dataset_publication
    ADD CONSTRAINT fk_annotation_publication_artifact_file
    FOREIGN KEY (annotation_artifact_file_id) REFERENCES platform_file_object(file_id);

UPDATE data_source
SET source_type = 'IMPORT',
    name = '图片导入批次',
    diagnostic_message = 'SANDBOX IMPORT connector verified',
    updated_at = CURRENT_TIMESTAMP
WHERE source_id = 'DSRC-CABIN-MINIO';

UPDATE data_source
SET name = '工单文本 API',
    database_name = 'workorder',
    description = '待确认工单 API',
    updated_at = CURRENT_TIMESTAMP
WHERE source_id = 'DSRC-YF-API';

UPDATE platform_file_object
SET object_key = 'TENANT-YF/dataset/FILE-DATASET-TEXT-001.jsonl',
    content_type = 'application/jsonl',
    updated_at = CURRENT_TIMESTAMP
WHERE file_id = 'FILE-DATASET-TEXT-001';

UPDATE dataset
SET name = '工单文本分类语料库',
    data_type = 'TEXT',
    tags = '工单,NLP,文本分类',
    description = '工单文本公开样例数据集',
    updated_at = CURRENT_TIMESTAMP
WHERE dataset_id = 'DATASET-WORKORDER-TEXT';

UPDATE annotation_label_template
SET scene = 'IMAGE_TAGGING',
    label_type = 'BOUNDING_BOX',
    name = '焊缝缺陷图片打标模板',
    updated_at = CURRENT_TIMESTAMP
WHERE template_id = 'LT-WELD-BBOX';

UPDATE annotation_label_template
SET scene = 'TEXT_LABELING',
    label_type = 'CATEGORY',
    name = '工单意图分类模板草稿',
    label_schema_json = '{"labels":[{"name":"报修"},{"name":"保养"},{"name":"咨询"}]}',
    label_studio_config_xml = '<View><Text name="text" value="$text"/><Choices name="intent" toName="text"><Choice value="报修"/><Choice value="保养"/><Choice value="咨询"/></Choices></View>',
    updated_at = CURRENT_TIMESTAMP
WHERE template_id = 'LT-TEXT-INTENT-DRAFT';

UPDATE annotation_task
SET scene = 'IMAGE_TAGGING',
    note = '原型任务：图片打标、AI 预标注、Label Studio seam',
    updated_at = CURRENT_TIMESTAMP
WHERE task_id = 'ANN-WELD-Q2';
