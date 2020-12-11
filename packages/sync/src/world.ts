import { Room } from './room'
import { Transmitter } from './transmitter'
import { Transport } from './transports/socket'
import { DefaultRoom, User } from './rooms/default'
import { Packet } from './packet';
import { RoomClass } from './interfaces/room.interface';

export class WorldClass {

    private rooms = new Map()
    private users: {
        [key: string]: User
    } = {}
    private userClass = User

    setUserClass(userClass: any) {
        this.userClass = userClass
    }

    transport(io): void {
        const transport = new Transport(io)
        transport.onConnected(this.connectUser.bind(this))
        transport.onDisconnected(this.disconnectUser.bind(this))
        transport.onJoin(this.joinRoom.bind(this))
        transport.onInput((id: string, prop: string, value: any) => {
            this.forEachUserRooms(id, (room: RoomClass) => {
                if (room.$inputs && room.$inputs[prop]) {
                    room[prop] = value
                }
            })
        })
        transport.onAction((id: string, name: string, value: any) => {
            this.forEachUserRooms(id, (room, user) => {
                if (room.$actions && room.$actions[name]) {
                    room[name](user, value)
                }
            })
        })
    }

    forEachUserRooms(userId: string, cb: (room: RoomClass, user: User) => void): void {
        const user = this.getUser(userId)
        for (let roomId of user._rooms) {
            const room = this.getRoom(roomId)
            cb(room, user)
        }
    }

    getUser(id: string): User {
        return this.users[id]
    }

    setUser(user, socket?) {
        if (socket) user._socket = socket
        user._rooms = []
        this.users[user.id] = user
        return user
    }

    send(): void {
        Transmitter.forEach((packets: Packet[], id: string) => {
            const room = this.getRoom(id)
            for (let id in room.users) {
                const user = room.users[id]
                for (let packet of packets) {
                    Transmitter.emit(user, packet) 
                } 
            }
        })
        Transmitter.clear()
    }

    connectUser(socket, id: string): User {
        const user = new this.userClass()
        user.id = id
        this.setUser(user, socket)
        return user
    }

    disconnectUser(userId: string): void {
        this.forEachUserRooms(userId, (room: RoomClass, user: User) => {
            if (room.$leave) room.$leave(user)
        })
        delete this.users[userId]
    }

    private joinOrLeaveRoom(type: string, roomId: string, userId: string): RoomClass | undefined  {
        const room = this.getRoom(roomId)
        if (!room) return
        if (room[type]) room[type](this.getUser(userId))
        return room
    }

    leaveRoom(roomId: string, userId: string): RoomClass | undefined {
        return this.joinOrLeaveRoom('$leave', roomId, userId)
    }

    joinRoom(roomId: string, userId: string): RoomClass | undefined {
        return this.joinOrLeaveRoom('$join', roomId, userId)
    }

    addRoom(id: string, roomClass, options?: any): RoomClass {
        if (roomClass.constructor.name == 'Function') {
            roomClass = new roomClass()
        }
        const room = new Room().add(id, roomClass, options)
        this.rooms.set(id, room)
        return room
    }

    getRoom(id: string): RoomClass {
        return this.rooms.get(id)
    }

    removeRoom(id: string): void {
        this.rooms.delete(id)
    }
}

export const World = new WorldClass()