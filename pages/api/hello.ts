import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log("Hello, World!");
    
    res.status(200).json({ name: 'John Doe' })
}