import { render } from 'preact'
import { Welcome } from './Welcome'

render(<Welcome />, document.getElementById('app') as HTMLElement)
