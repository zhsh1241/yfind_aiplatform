UPDATE annotation_work_item w
SET status = CASE WHEN NULLIF(w.annotation_json, '') IS NULL THEN 'PENDING' ELSE 'DRAFT' END,
    submitted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE w.status = 'REVIEW_PENDING'
  AND EXISTS (
      SELECT 1
      FROM annotation_task t
      WHERE t.task_id = w.task_id
        AND t.review_enabled = TRUE
  )
  AND NOT EXISTS (
      SELECT 1
      FROM annotation_review_item r
      WHERE r.work_item_id = w.work_item_id
  );

UPDATE annotation_task t
SET annotated_count = (
        SELECT COUNT(*)
        FROM annotation_work_item w
        WHERE w.task_id = t.task_id
          AND w.status IN ('SUBMITTED', 'REVIEW_PENDING', 'APPROVED')
    ),
    reviewed_count = (
        SELECT COUNT(*)
        FROM annotation_work_item w
        WHERE w.task_id = t.task_id
          AND w.status = 'APPROVED'
    ),
    quality_score = CASE
        WHEN t.total_count = 0 THEN 0
        ELSE LEAST(100, ROUND((
            (
                SELECT COUNT(*)
                FROM annotation_work_item w
                WHERE w.task_id = t.task_id
                  AND w.status = 'APPROVED'
            ) * 100.0
        ) / t.total_count))
    END,
    status = CASE
        WHEN t.total_count > 0 AND (
            SELECT COUNT(*)
            FROM annotation_work_item w
            WHERE w.task_id = t.task_id
              AND w.status = 'APPROVED'
        ) >= t.total_count THEN 'APPROVED'
        WHEN t.review_enabled = TRUE AND EXISTS (
            SELECT 1
            FROM annotation_work_item w
            WHERE w.task_id = t.task_id
              AND w.status IN ('SUBMITTED', 'REVIEW_PENDING', 'APPROVED')
        ) THEN 'PENDING_REVIEW'
        WHEN EXISTS (
            SELECT 1
            FROM annotation_work_item w
            WHERE w.task_id = t.task_id
              AND w.status IN ('SUBMITTED', 'REVIEW_PENDING', 'APPROVED')
        ) THEN 'IN_PROGRESS'
        WHEN EXISTS (
            SELECT 1
            FROM annotation_work_item w
            WHERE w.task_id = t.task_id
              AND w.status IN ('DRAFT', 'REJECTED')
        ) THEN 'IN_PROGRESS'
        ELSE t.status
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1
    FROM annotation_work_item w
    WHERE w.task_id = t.task_id
      AND (
          w.status IN ('PENDING', 'DRAFT')
          OR (
              w.status = 'REVIEW_PENDING'
              AND NOT EXISTS (
                  SELECT 1
                  FROM annotation_review_item r
                  WHERE r.work_item_id = w.work_item_id
              )
          )
      )
);
