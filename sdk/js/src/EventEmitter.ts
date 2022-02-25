import { DVCFeatureSet, DVCVariableSet } from "dvc-js-client-sdk"
import { DVCVariable } from './Variable'
import { checkParamType } from "./utils"

const EventNames = {
    INITIALIZED: 'initialized',
    ERROR: 'error',
    VARIABLE_UPDATED: 'variableUpdated',
    FEATURE_UPDATED: 'featureUpdated',
}

type eventHandler = (...args: any[]) => void

export class EventEmitter {
    events: Record<string, eventHandler[]>

    constructor() {
        this.events = {}
    }

    subscribe(key: string, handler: eventHandler) {
        checkParamType('key', key, 'string')
        checkParamType('handler', handler, 'function')
        
        const eventNames = Object.keys(EventNames).map(e => e.toLowerCase())
        if (!eventNames.includes(key) && 
            !key.startsWith(EventNames.VARIABLE_UPDATED) && 
            !key.startsWith(EventNames.FEATURE_UPDATED)) {
            throw new Error('Not a valid event to subscribe to')
        } else if (!this.events[key]) {
            this.events[key] = [ handler ]
        } else {
            this.events[key].push(handler)
        }
    }

    unsubscribe(key: string, handler?: eventHandler) {
        checkParamType('key', key, 'string')
        
        const eventNames = Object.keys(EventNames).map(e => e.toLowerCase())
        if (!eventNames.includes(key)) {
            return
        } else if (!handler) {
            this.events[key] = []
        } else {
            this.events[key] = this.events[key].filter(eventHandler => eventHandler !== handler)
        }
    }

    emit(key: string, ...args: any[]) {
        checkParamType('key', key, 'string')
        
        const handlers = this.events[key]
        if (!handlers) {
            this.events[key] = []
            return
        }

        handlers.forEach((handler) => {
            handler(...args)
        })
    }

    emitInitialized(success: boolean) {
        this.emit(EventNames.INITIALIZED, success)
    }

    emitError(error: Error) {
        this.emit(EventNames.ERROR, error)
    }

    emitVariableUpdates(
        oldVariableSet: DVCVariableSet, 
        newVariableSet: DVCVariableSet, 
        variableDefaultMap: { [key: string]: { [key: string]: DVCVariable } } 
    ) {
        const keys = Object.keys(oldVariableSet).concat(Object.keys(newVariableSet))
        keys.forEach((key) => {
            const oldVariableValue = oldVariableSet[key] && oldVariableSet[key].value
            const newVariable = newVariableSet[key]
            const newVariableValue = newVariable && newVariableSet[key].value

            if (oldVariableValue !== newVariableValue) {
                const variables = variableDefaultMap[key] && Object.values(variableDefaultMap[key])
                if (variables) {
                    variables.forEach((variable) => {
                        variable.value = newVariableValue
                        variable.callback?.call(variable, variable.value)
                    })
                }
                this.emit(`${EventNames.VARIABLE_UPDATED}:*`, key, newVariable)
                this.emit(`${EventNames.VARIABLE_UPDATED}:${key}`, key, newVariable)
            }
        })
    }

    emitFeatureUpdates(oldFeatureSet: DVCFeatureSet, newFeatureSet: DVCFeatureSet) {
        const keys = Object.keys(oldFeatureSet).concat(Object.keys(newFeatureSet))
        keys.forEach((key) => {
            const oldFeatureVariation = oldFeatureSet[key] && oldFeatureSet[key]._variation
            const newFeature = newFeatureSet[key]
            const newFeatureVariation = newFeature && newFeatureSet[key]._variation

            if (oldFeatureVariation !== newFeatureVariation) {
                this.emit(`${EventNames.FEATURE_UPDATED}:*`, key, newFeature)
                this.emit(`${EventNames.FEATURE_UPDATED}:${key}`, key, newFeature)
            }
        })
    }
}