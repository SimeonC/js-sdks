import type { Metadata } from 'next'
import { DevCycleServersideProvider } from '@devcycle/nextjs-sdk/server'
import React from 'react'

export const metadata: Metadata = {
    title: 'Create Next App',
    description: 'Generated by create next app',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
