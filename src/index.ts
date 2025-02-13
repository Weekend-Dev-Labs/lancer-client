import e from 'express'
import crypto from 'crypto'

type AuthHandler = ({
    token,
    session,
}: {
    token: string
    session: lancerTypes.SessionRequest
}) => Promise<{ ownerId: string; status: number }>

type WebHookHandler = ({
    event,
    payload,
}: {
    event: lancerTypes.Event
    payload: lancerTypes.WebhookEvent<lancerTypes.Session | lancerTypes.UFile>
}) => Promise<boolean>

function verifySignature(
    payload: string,
    timestamp: string,
    signature: string,
    secret: string,
) {
    const message = `${timestamp}.${payload}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(message)
    const expectedSignature = hmac.digest('hex')
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
    )
}

function lancer({ signingSecret }: { signingSecret: string }) {
    function auth(handler: AuthHandler) {
        return async (
            req: e.Request,
            res: e.Response,
            next: e.NextFunction,
        ) => {
            const authHeader = req.headers?.authorization?.split(' ')[1]
            if (!authHeader) {
                return res.status(403).send()
            }
            const body = req.body as lancerTypes.SessionRequest

            if (
                body.chunk_size &&
                body.file_name &&
                body.file_size &&
                body.max_chunk &&
                // body.mime_type &&
                body.provider
            ) {
                const ack = await handler({ token: authHeader, session: body })
                return res.status(ack.status).send({ ownerId: ack.ownerId })
            } else {
                return res.status(422).send()
            }
        }
    }

    function webhook(handler: WebHookHandler, verification?: boolean) {
        return async (
            req: e.Request,
            res: e.Response,
            next: e.NextFunction,
        ) => {
            if (verification) {
                const sig = req.headers['x-signature']
                const timestamp = req.headers['x-timestamp']
                if (sig && timestamp) {
                    const body = JSON.stringify(req.body)
                    const isVerified = verifySignature(
                        body,
                        timestamp as string,
                        sig as string,
                        signingSecret,
                    )
                    if (!isVerified) {
                        return res.status(400).send()
                    }
                } else {
                    return res.status(400).send()
                }
            }
            const ack = await handler({
                event: req.body.event,
                payload: req.body.data,
            })
            if (ack) {
                res.status(200).send()
                return
            } else {
                res.status(400).send()
                return
            }
        }
    }

    return {
        auth,
        webhook,
    }
}

export default lancer
