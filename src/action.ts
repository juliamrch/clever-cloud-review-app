import * as core from '@actions/core'
import { exec, type ExecOptions } from '@actions/exec'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PassThrough, Transform, Writable } from 'node:stream'
import { clearTimeout, setTimeout } from 'node:timers'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export type ExtraEnv = {
  [key: string]: string
}

export interface Arguments {
  orgaID?: string
  type?: string
  region?: string
//  name?: string
  domain?: string
  token: string
  secret: string
  alias?: string
//  appID?: string
//  force?: boolean
//  timeout?: number
  cleverCLI: string
//  extraEnv?: ExtraEnv
//  logFile?: string
//  quiet?: boolean
}

function throwMissingEnvVar(name: string): never {
  throw new Error(
    `Missing ${name} environment variable: https://err.sh/47ng/actions-clever-cloud/env`
  )
}

const ENV_LINE_REGEX = /^(\w+)=(.*)$/

function listExtraEnv(): ExtraEnv {
  const extraEnv = core
    .getMultilineInput('setEnv')
    .map(line => line.trim())
    .reduce(
      (env, line) => {
        const match = line.match(ENV_LINE_REGEX)
        if (!match) {
          return env
        }
        const key = match[1]!
        const value = match[2]!
        env[key] = value
        return env
      },
      {} as Record<string, string>
    )

  if (Object.keys(extraEnv).length) {
    core.info('Setting extra environment variables:')
    for (const envName in extraEnv) {
      core.info(`  ${envName}`)
    }
  }
  return extraEnv
}

export function processArguments(): Arguments {
  const token = process.env.CLEVER_TOKEN
  const secret = process.env.CLEVER_SECRET
  if (!token) {
    throwMissingEnvVar('CLEVER_TOKEN')
  }
  if (!secret) {
    throwMissingEnvVar('CLEVER_SECRET')
  }
  
  const orgaID = core.getInput('orgaID')
  const type = core.getInput('type')
  const region = core.getInput('region')
//  const name = core.getInput('name')
  const domain = core.getInput('domain')
//  const appID = core.getInput('appID')
  const alias = core.getInput('alias')
//  const force = core.getBooleanInput('force', { required: false })
//  const timeout = parseInt(core.getInput('timeout')) || undefined
//  const logFile = core.getInput('logFile') || undefined
//  const quiet = core.getBooleanInput('quiet', { required: false })
  return {
    orgaID,
    type,
    region,
//    name,
    domain,
    token,
    secret,
    alias,
//    force,
//    appID,
//    timeout,
    cleverCLI: path.resolve(__dirname, '../node_modules/.bin/clever'),
//    extraEnv: listExtraEnv(),
//    logFile,
//    quiet
  }
}

async function checkForShallowCopy(): Promise<void> {
  let output = ''
  await exec('git', ['rev-parse', '--is-shallow-repository'], {
    listeners: {
      stdout: (data: Buffer) => (output += data.toString())
    }
  })
  if (output.trim() === 'true') {
    throw new Error(`This action requires an unshallow working copy.
-> Use the following step before running this action:
 - uses: actions/checkout@v3
   with:
     fetch-depth: 0
`)
  }
}

export default async function create({
  orgaID,
  type,
  region,
//  name,
  domain,
//  token,
//  secret,
//  appID,
  alias,
//  force = false,
  cleverCLI,
//  timeout,
//  logFile,
//  quiet = false,
//  extraEnv = {}
}: Arguments): Promise<void> {
  try {
    await checkForShallowCopy()

    //const execOptions: ExecOptions = {
    //  outStream: await getOutputStream(quiet, logFile)
    //}

    core.debug(`Clever CLI path: ${cleverCLI}`)

    // Authenticate (this will only store the credentials at a known location)
   // await exec(cleverCLI, ['login', '--token', token, '--secret', secret])

   // Create App and depploy it. Default values are meant to stop Typescript from trhowing a tantrum.
    await exec(cleverCLI, [
      'create',
      '--type', type || 'static-apache',
      alias || 'review-app',
      '--alias', alias || 'review-app',
      '--region', region || 'par',
      '--org', orgaID || 'not-an-org',
    ])
    await exec(cleverCLI, ['domain add', domain || 'not-a-domain'])
    await exec(cleverCLI, ['deploy'])
  } catch (error) {
    core.setFailed(`Not today, Satan: ${error}`);
  }
}

    // There is an issue when there is a .clever.json file present
    // and only the appID is passed: link will work, but deploy will need
    // an alias to know which app to publish. In this case, we set the alias
    // to the appID, and the alias argument is ignored if also specified.
    //if (appID) {
    //  core.debug(`Linking ${appID}`)
    //  await exec(cleverCLI, ['link', appID, '--alias', appID], execOptions)
    //  alias = appID
    //}

    // Create the app
    //core.debug(`Deploying review app for ${alias}`)
    //if (alias && type && region && orgaID && domain) {
    //  await exec(cleverCLI, ['create', '--type', type, '--alias', alias, //'--region', region, '--org', orgaID], execOptions)
    //  await exec(cleverCLI, ['domain add', domain], execOptions)
    //} else {
    //  core.setFailed('Required parameters are missing for deployment.')
    //}

    // If there are environment variables to pass to the application,
    // set them before deployment so the new instance can use them.
    //for (const [envName, envValue] of Object.entries(extraEnv)) {
    //  const args = ['env', 'set']
    //  if (alias) {
    //    args.push('--alias', alias)
    //  }
    //  args.push(envName, envValue)
    //  core.info(`Setting environment variable ${envName}`)
    //  await exec(cleverCLI, args, execOptions)
    //}

    //const args = ['deploy']


    //if (force) {
    //  args.push('--force')
    //}

    //if (timeout) {
    //  let timeoutID: NodeJS.Timeout | undefined
    //  let timedOut = false
    //  const timeoutPromise = new Promise<void>(resolve => {
    //  timeoutID = setTimeout(() => {
    //    timedOut = true
    //    resolve()
    //    }, timeout)
    //  })
    //  const result = await Promise.race([
    //    exec(cleverCLI, args, execOptions),
    //    timeoutPromise
    //  ])
    //  if (timeoutID) {
    //    clearTimeout(timeoutID)
    //  }
    //  if (timedOut) {
    //    core.info('Deployment timed out, moving on with workflow run')
    //  }
    //  core.info(`result: ${result}`)
    //  if (typeof result === 'number' && result !== 0) {
    //    throw new Error(`Deployment failed with code ${result}`)
    //  }
    //} else {
    //  const code = await exec(cleverCLI, args, execOptions)
    //  core.info(`code: ${code}`)
    //  if (code !== 0) {
    //    throw new Error(`Deployment failed with code ${code}`)
    //  }
    //}
//  } catch (error) {
//    if (error instanceof Error) {
//      core.setFailed(error.message)
//    } else {
//      core.setFailed(String(error))
//    }
//  }
//}


// --

//async function getOutputStream(
//  quiet: boolean,
//  logFile?: string
//): Promise<Writable> {
//  const tee = new PassThrough()
//  if (!quiet) {
//    let lineSeparator = '\n'
//    async function* splitNewlines(
//      input: AsyncIterable<Buffer>
//    ): AsyncGenerator<string> {
//      for await (const chunk of input) {
//        const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
//        if (str.includes('\r\n')) {
//          lineSeparator = '\r\n'
//        }
//        const lines = str.split(/\r?\n/)
//        for (const line of lines) {
//          yield line
//        }
//      }
//    }
//    async function* injectAnnotations(
//      lines: AsyncIterable<string>
//    ): AsyncGenerator<string> {
//      for await (const line of lines) {
//        yield line + lineSeparator
//        // Remove timestamp
//        const message = line.slice('xxxx-xx-xxTxx:xx:xx+xx:xx '.length)
//        if (
//          message.startsWith('::notice ') ||
//          message.startsWith('::error ') ||
//          message.startsWith('::warning ')
//        ) {
//          yield message + lineSeparator
//        }
//      }
//    }
//    tee
//      .pipe(Transform.from(splitNewlines))
//      .pipe(Transform.from(injectAnnotations))
//      .pipe(process.stdout)
//  }
//  if (logFile) {
//    const logFileStream = (await fs.open(logFile, 'w')).createWriteStream()
//    tee.pipe(logFileStream)
//  }
//  return tee
//}

