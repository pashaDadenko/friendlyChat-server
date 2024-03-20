const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const route = require('./route');
const { addUser, findUser, getRoomUsers, removeUser } = require('./users');

app.use(cors({ origin: '*' }));
app.use(route);

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
	socket.on('join', ({ name, room }) => {
		socket.join(room);

		const { user } = addUser({ name, room });

		socket.emit('message', {
			data: { user: { name: 'Админ' }, message: `${user.name}, добро пожаловать во дружелюбный чат` },
		});

		socket.broadcast.to(user.room).emit('message', {
			data: { user: { name: 'Админ' }, message: `в чат подключился(лась) ${user.name}` },
		});

		io.to(user.room).emit('room', {
			data: { users: getRoomUsers(user.room) },
		});
	});

	socket.on('leftRoom', ({ params }) => {
		const user = removeUser(params);

		if (user) {
			const { room, name } = user;

			io.to(room).emit('message', {
				data: { user: { name: 'Админ' }, message: `${name} покинул чат` },
			});

			io.to(room).emit('room', {
				data: { users: getRoomUsers(room) },
			});
		}
	});

	socket.on('sendMessage', ({ message, params }) => {
		const user = findUser(params);

		user && io.to(user.room).emit('message', { data: { user, message } });
	});

	io.on('disconnect', () => {
		console.log('disconnect');
	});
});

server.listen(5000, () => console.log('server is running'));
