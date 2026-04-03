import { nanoid } from 'nanoid';

export function generateThreadId(): string {
  return nanoid(8);
}

export function generateCommentId(): string {
  return `c_${nanoid(8)}`;
}
