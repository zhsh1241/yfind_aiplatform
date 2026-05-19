CREATE DATABASE IF NOT EXISTS smp_source_mes CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE smp_source_mes;

CREATE TABLE IF NOT EXISTS mes_station_event (
    event_id VARCHAR(64) PRIMARY KEY,
    station_code VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    occurred_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_quality_ticket (
    ticket_id VARCHAR(64) PRIMARY KEY,
    supplier_code VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    description VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

TRUNCATE TABLE mes_station_event;
TRUNCATE TABLE supplier_quality_ticket;

INSERT INTO mes_station_event VALUES
('EVT-0001','CABIN-WELD-01','WELD_PARAM', JSON_OBJECT('current',12.3,'voltage',48.7,'robotSpeed',0.82), '2026-05-18 08:01:00'),
('EVT-0002','CABIN-WELD-02','VISION_DEFECT', JSON_OBJECT('defect','UNDERCUT','score',0.93,'image','s3://smp-datasets/TENANT-CABIN/raw/weld/image-0002.jpg'), '2026-05-18 08:03:00'),
('EVT-0003','QE-CMM-01','MEASURE_DRIFT', JSON_OBJECT('metric','gap_mm','value',1.41,'limit',1.30), '2026-05-18 09:30:00');

INSERT INTO supplier_quality_ticket VALUES
('SQT-0001','SUP-A01','HIGH','饰板焊点气孔连续 3 件超阈值','OPEN','2026-05-18 10:00:00'),
('SQT-0002','SUP-B02','MEDIUM','来料批次尺寸波动，需要复测','IN_REVIEW','2026-05-18 11:00:00');
