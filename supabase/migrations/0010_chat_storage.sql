INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 'chat-attachments', true, 52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4',
        'application/pdf','text/plain','application/zip']
);
