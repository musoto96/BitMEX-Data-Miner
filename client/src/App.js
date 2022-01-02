import './App.css';
import Test from './components/Test';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function App() {
  return (
    <Container>

      <Row>
        <h1>
          Hello
        </h1>
      </Row>

      <Container className="p-3">
        <Row>
          <Col>Home</Col>
          <Col>About</Col>
          <Col>Trades</Col>
          <Col>Contact</Col>
        </Row>
      </Container>

      <Row>
        <Col>
          <Test />
        </Col>
      </Row>

    </Container>
  );
}

export default App;
