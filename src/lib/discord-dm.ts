const API = 'https://discord.com/api/v10';

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
};

async function openDmChannel(botToken: string, discordId: string): Promise<string | null> {
  const res = await fetch(`${API}/users/@me/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

export async function sendDiscordDM(
  botToken: string,
  discordId: string,
  embeds: DiscordEmbed[]
): Promise<boolean> {
  const channelId = await openDmChannel(botToken, discordId);
  if (!channelId) return false;
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds }),
  });
  return res.ok;
}
