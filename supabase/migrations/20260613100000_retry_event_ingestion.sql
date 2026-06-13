-- The first TiranaFlow ingestion attempt used an unvalidated AI confidence value.
-- Reset only ingestion fingerprints so those source items can be processed again.
truncate table public.processed_items;
