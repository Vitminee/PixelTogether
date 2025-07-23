import { redirect } from 'next/navigation';
import CanvasPage from '@/components/CanvasPage';

const VALID_SIZES = [8, 16, 32, 64, 128, 256, 512];

interface PageProps {
  params: Promise<{ size: string }>;
}

export default async function SizePage({ params }: PageProps) {
  const { size } = await params;
  const sizeNum = parseInt(size);
  
  // Validate size
  if (!VALID_SIZES.includes(sizeNum)) {
    redirect('/');
  }
  
  return <CanvasPage size={sizeNum} />;
}

export async function generateStaticParams() {
  return VALID_SIZES.slice(0, -3).map((size) => ({
    size: size.toString(),
  }));
}