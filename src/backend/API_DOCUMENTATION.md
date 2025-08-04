# Partner Club Simulation API

This API allows running the Partner Club financial simulation with custom parameters.

## Custom Simulation Endpoint

`POST /api/custom-simulation`

This endpoint runs a financial simulation using custom parameters while preserving default values from the specified plan for other parameters.

### Request Parameters

```json
{
  "plan_id": "A",
  "max_rounds": 30,
  "scheduled_payment": {
    "1": 550000, 
    "2": 220000,
    "3": 330000,
    // ... more rounds
  }
}
```

- **plan_id** (string): The plan identifier (A, B, C, etc.)
- **max_rounds** (number): The number of rounds to simulate (will be capped to the plan's maximum rounds)
- **scheduled_payment** (object): A dictionary mapping round numbers (as strings) to payment amounts

### Response

```json
{
  "plan_id": "A",
  "history": [
    {
      "company_round": 1,
      "investor_count": 1,
      "total_payment": 550000,
      "total_revenue_before_tax": 160000,
      "total_revenue_after_tax": 154720,
      "net_profit_after_tax": -550000,
      "cumulative_net_profit": -550000
    },
    // ... more round results
  ]
}
```

Each round in the history contains:

- **company_round**: The round number
- **investor_count**: Number of active investors in this round
- **total_payment**: Total payments collected in this round
- **total_revenue_before_tax**: Total revenue generated before tax
- **total_revenue_after_tax**: Total revenue generated after tax (3.3% tax rate)
- **net_profit_after_tax**: Net profit for this round after tax
- **cumulative_net_profit**: Cumulative net profit up to this round

### Example usage

```javascript
// Example using fetch API
const response = await fetch('/api/custom-simulation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    plan_id: 'A',
    max_rounds: 30,
    scheduled_payment: {
      '1': 550000,
      '2': 220000,
      '3': 330000
      // Add more rounds as needed
    }
  })
});

const data = await response.json();
console.log(data);
```

## Notes

1. You must provide the `scheduled_payment` parameter with round numbers as keys and payment amounts as values.
2. All other parameters (sales_commission, settlement_bonus, etc.) will use the default values from the selected plan.
3. The simulation will use the smaller of the provided `max_rounds` and the plan's maximum rounds.
