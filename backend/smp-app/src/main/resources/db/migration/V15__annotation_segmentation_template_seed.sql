INSERT INTO annotation_label_template (
    template_id,
    tenant_id,
    name,
    scene,
    label_type,
    label_schema_json,
    label_studio_config_xml,
    status,
    created_by,
    created_at,
    updated_at
)
SELECT
    'LT-WELD-POLYGON',
    'TENANT-CABIN',
    '焊缝图片分割模板',
    'IMAGE_SEGMENTATION',
    'POLYGON',
    '{"labels":[{"name":"裂纹区域","color":"#E02020"},{"name":"气孔区域","color":"#F59E0B"},{"name":"夹渣区域","color":"#2563EB"}]}',
    '<View><Image name="image" value="$image"/><PolygonLabels name="label" toName="image"><Label value="裂纹区域"/><Label value="气孔区域"/><Label value="夹渣区域"/></PolygonLabels></View>',
    'PUBLISHED',
    'USR-ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM annotation_label_template
    WHERE template_id = 'LT-WELD-POLYGON'
);
