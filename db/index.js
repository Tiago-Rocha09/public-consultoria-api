
import knex from 'knex';

const connection = knex({
    client: 'mysql2',
    connection: {
      host : 'server',
      port : 3306,
      user : 'user',
      password : 'password',
      database : 'database'
    }
  });

export {
    connection
}