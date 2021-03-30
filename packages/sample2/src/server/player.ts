import { RpgPlayer, Control, Input } from '@rpgjs/server'

export class Player extends RpgPlayer {
    async onConnected() {
        this.setHitbox(8, 16)
        this.speed = 2
        this.setGraphic('hero')
        await this.changeMap('overworld')
    }
    onInput({ input }) {
      if (input == Control.Back) {
        this.callMainMenu()
      }
      if (input == 'attack') {
          this.showAnimation('hero', 'attack', true)
      }
      
    }
}