import { NextResponse } from 'next/server';
import { getCdekDeliveryPoints, getCdekCityCode } from '@/lib/cdek';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const city = searchParams.get('city');

        if (!city) {
            return NextResponse.json({ error: 'city is required' }, { status: 400 });
        }

        const cityCode = await getCdekCityCode(city);
        if (!cityCode) {
            return NextResponse.json({ error: 'City not found in CDEK' }, { status: 404 });
        }

        const points = await getCdekDeliveryPoints(cityCode);
        return NextResponse.json(points);

    } catch (error: any) {
        console.error("CDEK PVZ Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
