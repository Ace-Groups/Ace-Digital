import { store } from "@workspace/db";

export async function getOrCreateAcebotUser() {
  const email = "system_user_acebot";
  let user = await store.findUserByEmail(email);
  if (!user) {
    user = await store.createUser({
      email,
      fullName: "AceBot",
      passwordHash: "system_secured_password_hash_acebot",
      role: "employee",
      jobTitle: "System AI Agent",
    });
  }
  return user;
}
