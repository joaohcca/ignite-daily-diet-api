import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { usersRoutes } from './routes/user'
export const app = fastify()

app.register(cookie)
app.register(usersRoutes, { prefix: 'users' })
// app.register(transactionsRoutes, { prefix: "transactions" });
