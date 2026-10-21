-- Asegurar que al eliminar un activo se eliminen también en cascada
-- sus conversaciones de auditoría con el asistente de IA.
ALTER TABLE ai_conversations
DROP CONSTRAINT IF EXISTS ai_conversations_asset_id_fkey,
ADD CONSTRAINT ai_conversations_asset_id_fkey
    FOREIGN KEY (asset_id)
    REFERENCES assets(id)
    ON DELETE CASCADE;
