module('BackGammonBoard suite')
test( "Basic", function() {
  var b = new BackGammonBoard();
  equal(b.getNumPiecesAtPoint(1), 2);
  
  b.setDices([1, 3]);
  deepEqual(b.getRemainingDices(), [1, 3])
  
  // Move one piece
  b.move(1, 2, b.WHITE);
  equal(b.getNumPiecesAtPoint(1), 1);
  equal(b.getNumPiecesAtPoint(2), 1);
  deepEqual(b.getRemainingDices(), [3]);
  
  // Move second piece
  b.move(1, 4, b.WHITE);
  equal(b.getNumPiecesAtPoint(1), 0);
  equal(b.getNumPiecesAtPoint(4), 1);
  deepEqual(b.getRemainingDices(), []);
});


test("Save/Load", function () {
  var b = new BackGammonBoard();
  b.setDices([1, 3]);

  // Move one piece
  b.move(1, 2, b.WHITE);
  var obj = b.toObject();
  console.log(obj);
  
  
  // Test to load serialized board
  var b2 = new BackGammonBoard(obj);
  equal(b2.getNumPiecesAtPoint(1), 1);
  deepEqual(b2.getRemainingDices(), [3]);
  

})

test("Rollback", function() {
  var b = new BackGammonBoard();
  b.setDices([1, 3]);

  // Start transaction 1
  b.beginTransaction();
  b.move(1, 2, b.WHITE);
  equal(b.getNumPiecesAtPoint(1), 1);
  equal(b.getNumPiecesAtPoint(2), 1);
  deepEqual(b.getRemainingDices(), [3]);
  
  // Start transaction 2
  b.beginTransaction();
  b.move(1, 4, b.WHITE);
  equal(b.getNumPiecesAtPoint(1), 0);
  equal(b.getNumPiecesAtPoint(4), 1);
  deepEqual(b.getRemainingDices(), []);
  
  // Rollback transaction 2
  b.rollback();
  equal(b.getNumPiecesAtPoint(1), 1);
  equal(b.getNumPiecesAtPoint(2), 1);
  deepEqual(b.getRemainingDices(), [3]);
  
  // Rollback transaction 1
  b.rollback();
  equal(b.getNumPiecesAtPoint(1), 2);
  equal(b.getNumPiecesAtPoint(2), 0);
  deepEqual(b.getRemainingDices(), [1, 3]);
});

module('BackGammon');
test('Save/Load', function () {
  var b = new BackGammon('backgammon');
  
  var state = b.saveState();
  console.log(state)
  b.loadState(state);
  
  var strState = '{"currentPlayer":"w","gameState":1,"board":{"board":["","ww","","","","","bbbbb","","bbb","","","","wwwww","bbbbb","","","","www","","wwwww","","","","","bb","","","","","","","","","",""],"dices":[],"diceRoll":[]}}';
  
  b.loadState(strState)
  ok(true)
});