export async function getUser(id: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to load user");
  return res.json();
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}
