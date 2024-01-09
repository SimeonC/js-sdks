import { getVariableValue } from './getVariableValue'
import { getInitializedPromise, setInitializedPromise } from './requestContext'
import { DevCycleNextOptions, initialize } from './initialize'
import { DevCycleUser } from '@devcycle/js-client-sdk'
import { getUserAgent } from './userAgent'

// server-side users must always be "identified" with a user id
type ServerUser = Omit<DevCycleUser, 'user_id' | 'isAnonymous'> & {
    user_id: string
}

const ensureSetup = (
    sdkKey: string,
    userGetter: () => Promise<ServerUser> | ServerUser,
    options: DevCycleNextOptions,
) => {
    const initializedPromise = getInitializedPromise()
    if (!initializedPromise) {
        const serverDataPromise = initialize(sdkKey, userGetter, options)
        setInitializedPromise(serverDataPromise)

        return { serverDataPromise }
    }

    return { serverDataPromise: initializedPromise }
}

// allow return type inference
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const setupDevCycle = (
    sdkKey: string,
    userGetter: () => Promise<ServerUser> | ServerUser,
    options: DevCycleNextOptions = {},
) => {
    const _getVariableValue: typeof getVariableValue = async (
        key,
        defaultValue,
    ) => {
        ensureSetup(sdkKey, userGetter, options)
        return getVariableValue(key, defaultValue)
    }

    const _getClientContext = () => {
        const { serverDataPromise } = ensureSetup(sdkKey, userGetter, options)

        return {
            serverDataPromise,
            sdkKey: sdkKey,
            enableStreaming: options?.enableStreaming ?? false,
            userAgent: getUserAgent(),
        }
    }

    return {
        getVariableValue: _getVariableValue,
        getClientContext: _getClientContext,
    }
}