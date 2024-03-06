import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodyschema = z.object({
      name: z.string(),
      email: z.string().email(),
    })

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      })
    }
    const { name, email } = createUserBodyschema.parse(request.body)

    const userByEmail = await knex('users').where({ email }).first()

    if (userByEmail) {
      return reply.status(400).send({
        error: 'Email already exists',
      })
    }

    await knex('users').insert({
      id: randomUUID(),
      session_id: sessionId,
      name,
      email,
    })

    return reply.status(201).send()
  })
  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const user = request.user

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
        })
      }

      const meals = await knex('meals')
        .where({ user_id: user.id })
        .orderBy('date', 'desc')

      const totalMeals = meals.length
      const mealsInDiet = meals.filter((meal) => meal.is_on_diet).length
      const mealsOffDiet = totalMeals - mealsInDiet

      const { bestSequence } = meals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }
          if (acc.currentSequence > acc.bestSequence) {
            acc.bestSequence = acc.currentSequence
          }
          return acc
        },
        { bestSequence: 0, currentSequence: 0 },
      )
      return reply.send({
        totalMeals,
        mealsInDiet,
        mealsOffDiet,
        bestSequence,
      })
    },
  )
}
