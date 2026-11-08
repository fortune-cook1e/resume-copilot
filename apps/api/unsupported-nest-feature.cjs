// Nest loads these integrations optionally. Fail explicitly if one is actually requested.
throw new Error('This optional Nest integration is unavailable in the Workers API')
