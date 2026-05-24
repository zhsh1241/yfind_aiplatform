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
SET name = '影音接口 API',
    database_name = 'media-feed',
    description = '待确认影音接口 API',
    updated_at = CURRENT_TIMESTAMP
WHERE source_id = 'DSRC-YF-API';

UPDATE platform_file_object
SET object_key = 'TENANT-YF/dataset/FILE-DATASET-MEDIA-001.jsonl',
    content_type = 'application/jsonl',
    updated_at = CURRENT_TIMESTAMP
WHERE file_id = 'FILE-DATASET-TEXT-001';

UPDATE dataset
SET name = '影音质检接口样例数据集',
    data_type = 'AUDIO_VIDEO',
    tags = '影音,质检,接口',
    description = '影音接口接入样例数据集',
    updated_at = CURRENT_TIMESTAMP
WHERE dataset_id = 'DATASET-WORKORDER-TEXT';

UPDATE annotation_label_template
SET scene = 'IMAGE_TAGGING',
    label_type = 'BOUNDING_BOX',
    name = '焊缝缺陷图片打标模板',
    updated_at = CURRENT_TIMESTAMP
WHERE template_id = 'LT-WELD-BBOX';

UPDATE annotation_label_template
SET scene = 'IMAGE_SEGMENTATION',
    label_type = 'POLYGON',
    name = '焊缝缺陷图片分割模板草稿',
    label_schema_json = '{"labels":[{"name":"裂纹区域"},{"name":"气孔区域"}]}',
    label_studio_config_xml = '<View><Image name="image" value="$image"/><PolygonLabels name="label" toName="image"><Label value="裂纹区域"/><Label value="气孔区域"/></PolygonLabels></View>',
    updated_at = CURRENT_TIMESTAMP
WHERE template_id = 'LT-TEXT-INTENT-DRAFT';

UPDATE annotation_task
SET scene = 'IMAGE_TAGGING',
    note = '原型任务：图片打标、AI 预标注、Label Studio seam',
    updated_at = CURRENT_TIMESTAMP
WHERE task_id = 'ANN-WELD-Q2';
