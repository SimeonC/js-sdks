'use server'
import { revalidateTag } from 'next/cache'

export const invalidateConfig = async (sdkToken: string): Promise<void> => {
    if (typeof window != 'undefined') {
        console.error(
            'DevCycle realtime updates are only available in Next.js 14.0.5 and above. Please update your version ' +
                'or disable realtime updates.',
        )
        return
    }
    console.log('Invalidating old DevCycle cached config')
    revalidateTag(sdkToken)
}
