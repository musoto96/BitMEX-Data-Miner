import { Line } from 'react-chartjs-2';
import Container from 'react-bootstrap/Container';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

function Test() {
  return(
    <Container> 
      <Line className='figure'
        data={{
          labels: ['Jun', 'Jul', 'Aug'],
          datasets: [
            {
              id: 1,
              label: '',
              data: [5, 6, 7],
            },
            {
              id: 2,
              label: '',
              data: [3, 2, 1],
            },
          ],
        }}
      />
    </Container>
  )
};

export default Test;
