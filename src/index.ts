interface CreateSessionOption {
    baseChunkSize: number
    authToken: string
    provider: lancerTypes.Providers
}

interface CreateSessionResult {
    sessionToken: string
    file: File
    chunkSize: number
}

async function calculateChecksum(chunk: Blob) {
    const buffer = await chunk.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function lancer(serverUrl: string) {
    const url = {
        session: serverUrl + '/api/sessions',
        upload: serverUrl + '/api/upload',
    }
    const createSession = async (file: File, option: CreateSessionOption) => {
        const totalChunks = Math.ceil(file.size / option.baseChunkSize)
        const payload = {
            file_size: file.size,
            file_name: file.name,
            max_chunk: totalChunks,
            chunk_size: option.baseChunkSize,
            provider: option.provider,
        }
        const res = await fetch(url.session, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'content-type': 'application/json',
                authorization: 'Bearer ' + option.authToken,
            },
        })
        if (res?.status >= 400) {
            throw new Error(`${res.status}`)
        }
        const resBody = await res.json()
        return {
            ...resBody,
            file,
            chunkSize: option.baseChunkSize,
        } as CreateSessionResult
    }

    const uploadFile = async (option: CreateSessionResult) => {
        const chunks = []
        let start = 0
        while (start < option.file.size) {
            const end = Math.min(start + option.chunkSize, option.file.size)
            chunks.push({ start, end })
            start = end
        }

        for (let i = 0; i < chunks.length; i++) {
            const { start, end } = chunks[i]
            const chunk = option.file.slice(start, end)
            const checksum = await calculateChecksum(chunk)
            const formData = new FormData()
            formData.append('checksum', checksum)
            formData.append('chunk', i + 1)
            formData.append('file', chunk)

            const response = await fetch(url.upload, {
                method: 'POST',
                body: formData,
                headers: {
                    'content-type': 'multipart/form-data',
                    'x-session-token': option.sessionToken,
                },
            })
            const resBody =  await response.json()
            if(response.status >= 400){
                throw new Error(`${response?.status}`)
            }                
        }
    }
}
