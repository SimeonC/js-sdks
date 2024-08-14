'use client'
import React, { Suspense, use, useContext, useRef, useState } from 'react'
import { DevCycleClient, initializeDevCycle } from '@devcycle/js-client-sdk'
import { invalidateConfig } from '../../common/invalidateConfig'
import { DevCycleNextOptions, DevCycleServerData } from '../../common/types'
import { DevCycleProviderContext } from './context'
import { useRouter } from 'next/navigation'

export type DevCycleClientContext = {
    serverDataPromise: Promise<DevCycleServerData>
    serverData?: DevCycleServerData
    clientSDKKey: string
    options: DevCycleNextOptions
    enableStreaming: boolean
    realtimeDelay?: number
    userAgent?: string
}

type DevCycleClientsideProviderProps = {
    context: DevCycleClientContext
    promiseResolved: boolean
    children: React.ReactNode
}

/**
 * Component which renders nothing, but runs code to keep client state in sync with server
 * Also waits for the server's data promise with the `use` hook. This triggers the nearest suspense boundary,
 * so this component is being rendered inside of a Suspense by the DevCycleClientsideProvider.
 * @param serverDataPromise
 * @param userAgent
 * @constructor
 */
export const SuspendedProviderInitialization = ({
    serverDataPromise,
    userAgent,
}: Pick<
    DevCycleClientContext,
    'serverDataPromise' | 'userAgent'
>): React.ReactElement => {
    const serverData = use(serverDataPromise)
    const [previousContext, setPreviousContext] = useState<
        DevCycleServerData | undefined
    >()
    const context = useContext(DevCycleProviderContext)
    if (previousContext !== serverData) {
        // change user and config data to match latest server data
        // if the data has changed since the last invocation
        context.client.synchronizeBootstrapData(
            serverData.config,
            serverData.user,
            userAgent,
        )
        setPreviousContext(serverData)
    }
    return <></>
}

export const InternalDevCycleClientsideProvider = ({
    context,
    children,
    promiseResolved,
}: DevCycleClientsideProviderProps): React.ReactElement => {
    const clientRef = useRef<DevCycleClient>()
    const router = useRouter()

    const { serverDataPromise, serverData, clientSDKKey, enableStreaming } =
        context

    const revalidateConfig = async (lastModified?: number) => {
        if (context.realtimeDelay) {
            // wait configured delay before checking for new config
            await new Promise((resolve) =>
                setTimeout(resolve, context.realtimeDelay),
            )
        }
        try {
            await invalidateConfig(clientSDKKey)
        } catch {
            // do nothing on failure, this is best effort
        }
        if (context.realtimeDelay) {
            // if delay is configured, assume that the server action invalidation won't update any content and just
            // call for a full in-place refresh
            router.refresh()
        }
    }

    let resolvedServerData = serverData

    if (!serverData && promiseResolved) {
        // here the provider is being told from above that this promise has already resolved, so we can safely "use"
        // it without blocking rendering, even in streaming mode
        resolvedServerData = use(serverDataPromise)
    }

    if (!clientRef.current) {
        clientRef.current = initializeDevCycle(clientSDKKey, {
            ...context.options,
            sdkPlatform: 'nextjs',
            deferInitialization: true,
            disableConfigCache: true,
            next: {
                configRefreshHandler: revalidateConfig,
            },
        })

        if (resolvedServerData || !enableStreaming) {
            // we expect that either the promise has resolved and we got the server data that way, or we weren't in
            // streaming mode and so the promise was awaited at a higher level and passed in here as serverData
            if (!resolvedServerData) {
                throw new Error(
                    'Server data should be available. Please contact DevCycle support.',
                )
            }
            clientRef.current.synchronizeBootstrapData(
                resolvedServerData.config,
                resolvedServerData.user,
                context.userAgent,
            )
        }
    }

    return (
        <DevCycleProviderContext.Provider
            value={{
                client: clientRef.current,
                clientSDKKey,
                enableStreaming,
                serverDataPromise,
            }}
        >
            <Suspense>
                <SuspendedProviderInitialization
                    serverDataPromise={serverDataPromise}
                />
            </Suspense>
            {children}
        </DevCycleProviderContext.Provider>
    )
}
