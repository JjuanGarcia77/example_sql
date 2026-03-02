:one: Subir a GitHub

Inicializa tu repo en la carpeta del proyecto:

git init
git add .
git commit -m "Initial commit"

Crea un repo en GitHub (ej. megastore-api) y luego conecta tu carpeta local:

git remote add origin https://github.com/tu_usuario/megastore-api.git
git push -u origin main
:two: Clonar en otra máquina
git clone https://github.com/tu_usuario/megastore-api.git
cd megastore-api
:three: Instalar dependencias

Dentro de la carpeta clonada, ejecuta:

npm install

Esto instalará todas las librerías necesarias: express, mysql2, mongoose, multer, csv-parse, dotenv, etc.

:four: Configurar .env

El archivo .env contiene la conexión a las bases de datos. Si quieres usar otras bases de datos, cambia los valores de las variables:

PORT=3000

# MySQL
MYSQL_HOST=<TU_MYSQL_HOST>
MYSQL_USER=<TU_MYSQL_USER>
MYSQL_PASSWORD=<TU_MYSQL_PASSWORD>
MYSQL_DATABASE=<TU_MYSQL_DATABASE>
MYSQL_PORT=<TU_MYSQL_PORT>

# MongoDB
MONGO_URI=<TU_MONGO_URI>
Ejemplos de MongoDB:

Local: mongodb://localhost:27017/megastore_audit

Atlas (nube): mongodb+srv://usuario:password@cluster0.mongodb.net/megastore_audit?retryWrites=true&w=majority

Ejemplos de MySQL:

Local: localhost, puerto 3306

Remoto: db4free.net u otro host externo

Nota: No subas .env a GitHub, contiene tus contraseñas. Ponlo en .gitignore.

:five: Crear las bases de datos y tablas en MySQL

Si tu nueva base de datos está vacía:

Entra a MySQL:

mysql -u <user> -p

Crea la base:

CREATE DATABASE megastore;
USE megastore;

Crea las tablas según tu modelo SQL (puedes usar los scripts SQL que ya tienes en tu proyecto).

:six: MongoDB

Si cambias de base, asegúrate de que el nombre de la base en tu .env (MONGO_URI) exista o Mongo lo creará automáticamente cuando hagas la primera escritura.

MongoDB guardará los logs de auditoría allí.

:seven: Levantar el servidor
node server.js

Si todo está bien conectado, en consola verás:

MongoDB connected
Server running on http://localhost:3000
:eight: Probar endpoints

Abre Postman y prueba tus endpoints:

GET http://localhost:3000/api/customers
POST http://localhost:3000/api/customers

Subir CSV también funcionará con la nueva base de datos.

:white_check_mark: Resumen para cambiar de bases de datos:

Cambia las variables en .env.

Asegúrate de que MySQL tenga las tablas necesarias.

Asegúrate de que MongoDB tenga la base o que pueda crearla.

Levanta el servidor con node server.js.

Prueba todos los endpoints en Postman.