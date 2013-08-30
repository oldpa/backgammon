;(function() {
'use strict';

window['BackGammonAI'] = window['BackGammonAI'] || function(bg, me) {
  
var return_object = {}

// variables
var opponent = bg.swap(me);

// Util functions

var average = function(list) {
  return sum(list)/list.length;
}

var copyArray = function(a) {
  var b = [];
  for (var i=0; i < a.length; i++) {
    b.push(a[i]);
  }
  return b;
}

var sum = function(list) {
  var sum = 0;
  for (var i=0; i < list.length; i++) {
    sum += list[i];
  }
  return sum
}

var getUnique = function(list, ignoreValue) {
  var u = {}, a = [];
   for(var i = 0, l = list.length; i < l; ++i){
      if(u.hasOwnProperty(list[i]) || list[i] == ignoreValue) {
         continue;
      }
      a.push(list[i]);
      u[list[i]] = 1;
   }
   return a;
}

var getPossibleDiceThrows = function() {
  var diceThrows = [];
  for (var i=1; i <= 6; i++) {
    for (var j=1; j <= 6; j++) {
      if ( i == j ) {
        diceThrows.push([i, i, i, i]);
      } else {
        diceThrows.push([i, j]);
      }
    }
  }
  return diceThrows;
}
  
var stateChanged = function() {
  console.log('STATE')
  // Not your turn!
  if (bg.getCurrentPlayer() != me) {
    return;
  }
  
  if (bg.getGameState() == bg.STATES.CHOOSE_STARTER || bg.getGameState() == bg.STATES.THROWING_DICE) {
    throwDice();
  } else if (bg.getGameState() == bg.STATES.MOVING) {
    console.log('state:', bg.getGameState())
    chooseMove();
  }
}

var filterValidMoves = function(board, moves, player, dices) {

  var validMoves = [];
  board.beginTransaction();
  for (var i=0; i<moves.length; i++) {
    var fromPoint = moves[i][0],
        toPoint = moves[i][1];
    if (board.isValidMove(fromPoint, toPoint, player)) {
      board.move(fromPoint, toPoint, player);
      validMoves.push([fromPoint, toPoint]);
    }
  }
  board.rollback();
  return validMoves;
}

var getPossibleMoves = function (board, player, dices) {
  var possibleMoves = [];
  
  var availablePositions = board.getPointsWithPlayer(player);

  // Get all possible pieces to move
  var pointPermutations = getPermutations(availablePositions, dices.length, 2);
  var dicePermutations = [dices, copyArray(dices).reverse()];
  var maxMoves = 0;
  for (var i=0; i < pointPermutations.length; i++) {
    for (var dicePerm=0; dicePerm < dicePermutations.length; dicePerm++) {
      var dicePermutation = dicePermutations[dicePerm];

      var moves = [];
      var toPoint;
      // Get moves series
      for (var diceIdx=0; diceIdx < dicePermutation.length; diceIdx++) {
        var fromPoint = pointPermutations[i][diceIdx];
        // fromPoint is empty means move the last piece again
        if (fromPoint == '') {
          fromPoint = toPoint;
        }
        toPoint = board.getToPoint(player, fromPoint, dicePermutation[diceIdx]);
        moves.push([fromPoint, toPoint]);
      }
      
      // Get valid moves
      var validMoves = filterValidMoves(board, moves, player, dicePermutation);
      if (validMoves) {
        possibleMoves.push(validMoves);
        if (validMoves.length > maxMoves) {
          maxMoves = validMoves.length;
        }
      }
    }
  }
  
  // Only return moves that use maximum number of dices
  possibleMoves = possibleMoves.filter(function(v) { return v.length == maxMoves});
  
  // Remove duplicates
  possibleMoves = getUnique(possibleMoves);
  
  return possibleMoves;
}

// Get all permutations of length "length" for list
var getPermutations = function (list, length, maxUnique) {
  maxUnique = maxUnique || length;
  var permutations = [[],[]];
  // Add permutations of length 1
  for (var item=0; item<list.length; item++) {
    permutations[1].push([list[item]]);
  }
  
  // Add permutations of length n
  for (var i=2; i<=length; i++) {
    permutations[i] = [];
    for (var perm=0; perm < permutations[i-1].length; perm++) {
      var lastPermutations = permutations[i-1][perm];
      // get unique items in lastPermutations, ignoring ''
      var uniques = getUnique(lastPermutations, '');
      for (var item=0; item<list.length; item++) {
        // Check if we have too many unique items in permutation
        if (uniques.length >= maxUnique && uniques.indexOf(list[item]) == -1) {
          continue;
        }
        permutations[i].push(lastPermutations.concat(list[item]));          
      }
      // Add an empty item representing moving the same piece again
      permutations[i].push(lastPermutations.concat(''));
    }
  }
  return permutations[length];
}

var getBoardValue = function(board, player) {
  var score = board.getPlayerScore(player);
  var safePieces = board.getPointsWithPlayer(player, 2);
  var unsafePieces = board.getPointsWithPlayer(player, 1, 1);
  var outPieces = board.numPiecesOut(player);
  var homePieces = board.numPiecesHome(player);
  // Higher score is worse
  
  // Add score for each piece alone, the lower the point value the more score we add
  score += sum(board.getPointsValue(unsafePieces, bg.swap(player)))
  score -= sum(board.getPointsValue(safePieces, bg.swap(player)));
  score += outPieces * 12;
  score += homePieces * 12;
  return score;
}

var getMoveStrength = function (board, moves) {
  var myScoreBefore = getBoardValue(board, me);
  var oppScoreBefore = getBoardValue(board, opponent);
  
  // Apply the moves to the board
  board.beginTransaction();
  board.multiMoves(moves, me);
  // Remember higher score is worse, so (before - after) should be higher for good moves
  var myDiff = (myScoreBefore - getBoardValue(board, me));
  var opDiff = (oppScoreBefore - getBoardValue(board, opponent))
  console.log('diff', myDiff, opDiff, oppScoreBefore, getBoardValue(board, opponent), board.getPointsWithPlayer(board.WHITE));
  var scoreDiff = myDiff - opDiff;
  board.rollback();
  return scoreDiff;
}

var movesToString = function (moves) {
  var s = '';
  for (var i=0; i < moves.length; i++){
    s += moves[i][0] + ' => ' +  moves[i][1] + ',';
  }
  return s;
}

var chooseMove = function () {
  console.log('about to choose move');
  console.log('remaining dices', bg.getBoard().getRemainingDices());
  var tmpBoard = bg.getBoard().copy()
  var moves = getPossibleMoves(tmpBoard, me, bg.getBoard().getRemainingDices());
  console.log(moves.length, 'moves to evaluate');
  var bestMoveScore = -10000;
  var bestMoves = [];
  for (var i=0; i < moves.length; i++){
    var strength = getMoveStrength(tmpBoard, moves[i]);
    console.log(movesToString(moves[i]), strength)
    if (strength > bestMoveScore) {
      bestMoveScore = strength;
      bestMoves = moves[i];
    }
  }
  console.log('best moves', movesToString(bestMoves), 'strength', bestMoveScore)
  bg.applyMoves(bestMoves);

}

var throwDice = function () {
  console.log('computer is throwing dice');
  bg.throwDice()
}

var runTests = function () {
  var res = getPermutations([1,2], 2)
  var expected = [[1,1],[1,2],[1,''],[2,2], [2,'']]
  if (res.length != expected.length) {
    console.log('getPermutations failed', res, expected)
  }
  res = getPermutations([1,2,3], 2, 1)
  expected = [[1,1], [1,''], [2,2], [2,''], [3,3], [3,'']];
  if (res.length != expected.length) {
    console.log('getPermutations maxUniquqe failed', res, expected)
  }
  
//  console.log('hej', getPermutations([2,4,5,7,19,23], 4, 2).toString());
  var p = getPermutations([2,4,5,7,19,23], 2, 2);
  for (var i=0; i<p.length; i++) {
    console.log(p[i].toString())
  }
}

return_object.stateChanged = stateChanged;
return_object.getBoardValue = getBoardValue;

  
return return_object;
} // end window.BackGammonAI

})();