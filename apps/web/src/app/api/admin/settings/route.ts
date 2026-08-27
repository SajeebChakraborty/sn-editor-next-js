import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { getSettings, updateSettings } from '@/server/account/store';
import { isAdminUser, requireAdminResponse } from '@/server/auth/adminGuard';
import { maskSecret } from '@/server/stripe';
import { DEFAULT_SETTINGS } from '@/server/account/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LOGO_CHARS = 700_000;

function publicSettings(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    stripePublishableKey: settings.stripePublishableKey,
    stripeSecretKeyMasked: maskSecret(settings.stripeSecretKey),
    stripeWebhookSecretMasked: maskSecret(settings.stripeWebhookSecret),
    hasSecretKey: Boolean(settings.stripeSecretKey.trim()),
    hasWebhookSecret: Boolean(settings.stripeWebhookSecret.trim()),
    brandName: settings.brandName?.trim() || DEFAULT_SETTINGS.brandName,
    brandLogo: settings.brandLogo ?? '',
  };
}

export async function GET() {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  return NextResponse.json(publicSettings(await getSettings()));
}

export async function PUT(req: NextRequest) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const body = (await req.json().catch(() => null)) as {
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    brandName?: string;
    brandLogo?: string | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const current = await getSettings();
  const brandName =
    typeof body.brandName === 'string' && body.brandName.trim()
      ? body.brandName.trim().slice(0, 60)
      : current.brandName || DEFAULT_SETTINGS.brandName;
  let brandLogo = current.brandLogo ?? '';
  if (typeof body.brandLogo === 'string') {
    if (body.brandLogo.length > MAX_LOGO_CHARS) {
      return NextResponse.json({ error: 'Logo is too large. Use a smaller PNG or JPG.' }, { status: 400 });
    }
    if (body.brandLogo && !body.brandLogo.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Logo must be an image file' }, { status: 400 });
    }
    brandLogo = body.brandLogo;
  } else if (body.brandLogo === null) {
    brandLogo = '';
  }

  const next = await updateSettings({
    stripePublishableKey:
      typeof body.stripePublishableKey === 'string' ? body.stripePublishableKey.trim() : current.stripePublishableKey,
    stripeSecretKey:
      typeof body.stripeSecretKey === 'string' && body.stripeSecretKey.trim()
        ? body.stripeSecretKey.trim()
        : current.stripeSecretKey,
    stripeWebhookSecret:
      typeof body.stripeWebhookSecret === 'string' && body.stripeWebhookSecret.trim()
        ? body.stripeWebhookSecret.trim()
        : current.stripeWebhookSecret,
    brandName,
    brandLogo,
  });

  return NextResponse.json(publicSettings(next));
}
