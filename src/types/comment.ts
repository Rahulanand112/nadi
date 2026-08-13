export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  membership: { id: string; displayName: string };
};
