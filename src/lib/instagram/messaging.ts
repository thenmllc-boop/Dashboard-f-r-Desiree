import { igFetch } from "./client";

/**
 * Instagram Messaging API.
 * https://developers.facebook.com/docs/messenger-platform/instagram/
 *
 * Conversations are fetched through the linked Facebook Page:
 *   GET /{ig-user-id}/conversations?platform=instagram
 * Sending messages also goes through the Page Access Token.
 *
 * Webhooks (recommended): subscribe to `messages`, `messaging_postbacks`,
 * `message_reactions`, `comments` on the App's Webhooks > Instagram tab.
 */

export type IgConversation = {
  id: string;
  participants: { data: Array<{ id: string; username?: string; name?: string }> };
  updated_time: string;
};

export async function fetchConversations(igUserId: string, accessToken?: string) {
  return igFetch<{ data: IgConversation[] }>(`/${igUserId}/conversations`, {
    accessToken,
    searchParams: {
      platform: "instagram",
      fields: "id,participants{id,username,name},updated_time",
    },
  });
}

export type IgMessage = {
  id: string;
  from: { id: string; username?: string };
  to: { data: Array<{ id: string; username?: string }> };
  message?: string;
  created_time: string;
};

export async function fetchConversationMessages(conversationId: string, accessToken?: string) {
  return igFetch<{ data: IgMessage[] }>(`/${conversationId}`, {
    accessToken,
    searchParams: {
      fields: "messages.limit(50){id,from,to,message,created_time}",
    },
  });
}

export async function sendDm(igUserId: string, recipientIgsId: string, text: string, accessToken?: string) {
  // POST /{ig-user-id}/messages
  const url = `/${igUserId}/messages`;
  return igFetch(url, {
    accessToken,
    searchParams: {
      recipient: JSON.stringify({ id: recipientIgsId }),
      message: JSON.stringify({ text }),
      messaging_type: "RESPONSE",
    },
  });
}
