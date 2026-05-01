import { redirect } from 'next/navigation';

export default function BarbershopRedirectPage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}`);
}
